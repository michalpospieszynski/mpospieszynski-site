package pl.mpospieszynski.site.skills.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;
import pl.mpospieszynski.site.shared.text.Slugs;
import pl.mpospieszynski.site.shared.web.ConflictException;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AdminExpertiseArea;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AdminTechnology;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AreaInput;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AreaTexts;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.TechnologyInput;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.TechnologyTexts;
import pl.mpospieszynski.site.skills.infra.AdminSkillsQueries;
import pl.mpospieszynski.site.skills.infra.ExpertiseAreaRepository;
import pl.mpospieszynski.site.skills.infra.TechnologyRepository;

/** Admin commands for technologies and expertise areas (docs/screens/admin/07-skills.md). */
@Service
public class SkillsAdminService {

    static final int DESCRIPTION_MAX = 200;

    private final TechnologyRepository technologies;
    private final ExpertiseAreaRepository areas;
    private final AdminSkillsQueries queries;
    private final ApplicationEventPublisher events;

    public SkillsAdminService(TechnologyRepository technologies, ExpertiseAreaRepository areas, AdminSkillsQueries queries,
                              ApplicationEventPublisher events) {
        this.technologies = technologies;
        this.areas = areas;
        this.queries = queries;
        this.events = events;
    }

    // Technologies ---------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminTechnology> listTechnologies() {
        Map<UUID, Long> counts = queries.projectCounts();
        return technologies.findAll().stream()
                .sorted(Comparator.comparing(Technology::category).thenComparingInt(Technology::sortOrder)
                        .thenComparing(Technology::name))
                .map(t -> view(t, counts.getOrDefault(t.id(), 0L)))
                .toList();
    }

    @Transactional
    public AdminTechnology createTechnology(TechnologyInput in) {
        Technology technology = new Technology(technologies.maxSortOrder() + 10);
        applyTechnology(technology, in, null);
        Technology saved = technologies.saveAndFlush(technology);
        changed();
        return view(saved, 0);
    }

    @Transactional
    public AdminTechnology saveTechnology(UUID id, TechnologyInput in) {
        Technology technology = technologies.findById(id).orElseThrow(NotFoundException::new);
        if (technology.version() != in.version()) {
            throw new ConflictException("admin.errors.staleVersion");
        }
        applyTechnology(technology, in, id);
        Technology saved = technologies.saveAndFlush(technology);
        changed();
        return view(saved, queries.projectCount(id));
    }

    /** 409 with the number of projects while any project uses it (hide it instead). */
    @Transactional
    public void deleteTechnology(UUID id) {
        Technology technology = technologies.findById(id).orElseThrow(NotFoundException::new);
        long used = queries.projectCount(id);
        if (used > 0) {
            throw new ConflictException("admin.technology.inUse", used);
        }
        technologies.delete(technology);
        changed();
    }

    @Transactional
    public void reorderTechnologies(List<UUID> ids) {
        for (int i = 0; i < ids.size(); i++) {
            int order = (i + 1) * 10;
            technologies.findById(ids.get(i)).ifPresent(t -> t.setSortOrder(order));
        }
        changed();
    }

    private void applyTechnology(Technology technology, TechnologyInput in, UUID id) {
        List<FieldProblem> problems = new ArrayList<>();
        String name = in.name() == null ? "" : in.name().strip();
        if (name.isEmpty()) {
            problems.add(new FieldProblem("name", "admin.errors.required"));
        } else {
            technologies.findByNameIgnoreCase(name).filter(other -> !other.id().equals(id))
                    .ifPresent(other -> problems.add(new FieldProblem("name", "admin.errors.nameTaken")));
        }
        String slug = in.slug() == null || in.slug().isBlank() ? Slugs.slugify(name) : in.slug().strip();
        if (!Slugs.isValid(slug)) {
            problems.add(new FieldProblem("slug", "admin.errors.slugFormat"));
        } else {
            technologies.findBySlug(slug).filter(other -> !other.id().equals(id))
                    .ifPresent(other -> problems.add(new FieldProblem("slug", "admin.errors.slugTaken")));
        }
        if (in.sinceYear() != null && (in.sinceYear() < 1990 || in.sinceYear() > 2100)) {
            problems.add(new FieldProblem("sinceYear", "admin.errors.required"));
        }
        String pl = description(in, true);
        String en = description(in, false);
        checkLength(problems, "translations.pl.description", pl);
        checkLength(problems, "translations.en.description", en);
        if (blank(pl) && !blank(en)) {
            problems.add(new FieldProblem("translations.pl.description", "admin.errors.required"));
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        technology.edit(slug, name, in.category() == null ? TechnologyCategory.TOOLING : in.category(),
                in.showOnSkillsPage() == null || in.showOnSkillsPage(), in.sinceYear(), pl, en);
    }

    private static String description(TechnologyInput in, boolean polish) {
        if (in.translations() == null) {
            return null;
        }
        TechnologyTexts texts = polish ? in.translations().pl() : in.translations().en();
        return texts == null ? null : texts.description();
    }

    private static void checkLength(List<FieldProblem> problems, String field, String text) {
        if (text != null && text.strip().length() > DESCRIPTION_MAX) {
            problems.add(new FieldProblem(field, "admin.errors.tooLong", DESCRIPTION_MAX));
        }
    }

    private static AdminTechnology view(Technology t, long projectCount) {
        String pl = t.description("pl");
        String en = t.description("en");
        TranslationStatus status = pl == null ? TranslationStatus.COMPLETE
                : TranslationStatus.of(List.of(pl), en == null ? null : List.of(en));
        return new AdminTechnology(t.id(), t.version(), t.slug(), t.name(), t.category(), t.showOnSkillsPage(),
                t.sinceYear(), t.sortOrder(), projectCount, status,
                new SkillsAdmin.TechnologyTranslations(pl == null ? null : new TechnologyTexts(pl),
                        en == null ? null : new TechnologyTexts(en)));
    }

    // Expertise areas ------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminExpertiseArea> listAreas() {
        return areas.findAll().stream().sorted(Comparator.comparingInt(ExpertiseArea::sortOrder)).map(this::view).toList();
    }

    @Transactional
    public AdminExpertiseArea createArea(AreaInput in) {
        ExpertiseArea area = new ExpertiseArea(areas.maxSortOrder() + 10);
        applyArea(area, in);
        ExpertiseArea saved = areas.saveAndFlush(area);
        queries.replaceAreaLinks(saved.id(), list(in.technologyIds()), list(in.projectIds()));
        changed();
        return view(saved);
    }

    @Transactional
    public AdminExpertiseArea saveArea(UUID id, AreaInput in) {
        ExpertiseArea area = areas.findById(id).orElseThrow(NotFoundException::new);
        if (area.version() != in.version()) {
            throw new ConflictException("admin.errors.staleVersion");
        }
        applyArea(area, in);
        queries.replaceAreaLinks(id, list(in.technologyIds()), list(in.projectIds()));
        ExpertiseArea saved = areas.saveAndFlush(area);
        changed();
        return view(saved);
    }

    @Transactional
    public void deleteArea(UUID id) {
        areas.delete(areas.findById(id).orElseThrow(NotFoundException::new));
        changed();
    }

    @Transactional
    public void reorderAreas(List<UUID> ids) {
        for (int i = 0; i < ids.size(); i++) {
            int order = (i + 1) * 10;
            areas.findById(ids.get(i)).ifPresent(a -> a.setSortOrder(order));
        }
        changed();
    }

    private void applyArea(ExpertiseArea area, AreaInput in) {
        List<FieldProblem> problems = new ArrayList<>();
        AreaTexts pl = in.translations() == null ? null : in.translations().pl();
        AreaTexts en = in.translations() == null ? null : in.translations().en();
        if (pl == null || blank(pl.title())) {
            problems.add(new FieldProblem("translations.pl.title", "admin.errors.required"));
        }
        if (pl == null || blank(pl.summary())) {
            problems.add(new FieldProblem("translations.pl.summary", "admin.errors.required"));
        }
        if (en != null && blank(en.title()) && blank(en.summary()) && blank(en.descriptionMd())) {
            en = null;
        }
        if (en != null) {
            if (blank(en.title())) {
                problems.add(new FieldProblem("translations.en.title", "admin.errors.enRequired"));
            }
            if (blank(en.summary())) {
                problems.add(new FieldProblem("translations.en.summary", "admin.errors.enRequired"));
            }
        }
        if (queries.countExisting("technology", list(in.technologyIds()).stream().distinct().toList())
                != list(in.technologyIds()).stream().distinct().count()) {
            problems.add(new FieldProblem("technologyIds", "admin.errors.unknownReference"));
        }
        if (queries.countExisting("project", list(in.projectIds()).stream().distinct().toList())
                != list(in.projectIds()).stream().distinct().count()) {
            problems.add(new FieldProblem("projectIds", "admin.errors.unknownReference"));
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        area.edit(new ExpertiseArea.AreaText(pl), en == null ? null : new ExpertiseArea.AreaText(en));
    }

    private AdminExpertiseArea view(ExpertiseArea a) {
        ExpertiseArea.AreaText en = a.text("en");
        AreaTexts pl = a.text("pl").toTexts();
        return new AdminExpertiseArea(a.id(), a.version(), a.sortOrder(), queries.areaTechnologies(a.id()),
                queries.areaProjects(a.id()), areaStatus(a),
                new SkillsAdmin.AreaTranslations(pl, en == null ? null : en.toTexts()));
    }

    private static TranslationStatus areaStatus(ExpertiseArea a) {
        AreaTexts pl = a.text("pl").toTexts();
        ExpertiseArea.AreaText en = a.text("en");
        return TranslationStatus.of(Arrays.asList(pl.title(), pl.summary(), pl.descriptionMd()),
                en == null ? null : Arrays.asList(en.toTexts().title(), en.toTexts().summary(), en.toTexts().descriptionMd()));
    }

    // Dashboard ------------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TranslationGap> translationGaps() {
        List<TranslationGap> gaps = new ArrayList<>();
        for (AdminTechnology t : listTechnologies()) {
            if (t.enStatus() != TranslationStatus.COMPLETE) {
                gaps.add(new TranslationGap(TranslationGap.Type.TECHNOLOGY, t.id(), t.name(), t.enStatus()));
            }
        }
        for (ExpertiseArea a : areas.findAll()) {
            TranslationStatus status = areaStatus(a);
            if (status != TranslationStatus.COMPLETE) {
                gaps.add(new TranslationGap(TranslationGap.Type.EXPERTISE_AREA, a.id(), a.text("pl").toTexts().title(), status));
            }
        }
        return gaps;
    }

    private void changed() {
        events.publishEvent(new ContentChangedEvent("skills"));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static <T> List<T> list(List<T> values) {
        return values == null ? List.of() : values;
    }
}
