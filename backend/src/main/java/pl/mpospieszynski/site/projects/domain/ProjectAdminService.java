package pl.mpospieszynski.site.projects.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.projects.infra.AdminProjectQueries;
import pl.mpospieszynski.site.projects.infra.ProjectRepository;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;
import pl.mpospieszynski.site.shared.text.Slugs;
import pl.mpospieszynski.site.shared.web.ConflictException;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;

/**
 * Admin commands and reads for projects (docs/screens/admin/05-projects-list.md, 06-project-editor.md).
 * Saving a draft needs only the Polish title and slug; publishing needs the full Polish story and a cover with
 * alt text. English is either absent or has at least title, slug and summary.
 */
@Service
public class ProjectAdminService {

    private static final int SEO_MAX = 160;

    private final ProjectRepository projects;
    private final AdminProjectQueries queries;
    private final ApplicationEventPublisher events;

    public ProjectAdminService(ProjectRepository projects, AdminProjectQueries queries, ApplicationEventPublisher events) {
        this.projects = projects;
        this.queries = queries;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<ProjectAdmin.AdminProjectListItem> list(ProjectStatus status) {
        return projects.findAll().stream()
                .filter(p -> status == null || p.status() == status)
                .sorted(Comparator.comparingInt(Project::sortOrder).thenComparing(p -> p.text("pl").toTexts().title()))
                .map(p -> new ProjectAdmin.AdminProjectListItem(p.id(), p.version(), p.text("pl").toTexts().title(), p.status(),
                        p.featured(), enStatus(p), p.sortOrder(), p.updatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectAdmin.AdminProject get(UUID id) {
        return view(find(id));
    }

    @Transactional
    public ProjectAdmin.ProjectSaved create(ProjectAdmin.ProjectInput in) {
        Project project = Project.newDraft(projects.maxSortOrder() + 10);
        apply(project, in, null);
        Project saved = projects.saveAndFlush(project);
        queries.replaceLinks(saved.id(), list(in.technologyIds()), list(in.galleryMediaIds()), list(in.expertiseAreaIds()));
        changed();
        return new ProjectAdmin.ProjectSaved(saved.id(), saved.version(), saved.status());
    }

    @Transactional
    public ProjectAdmin.ProjectSaved save(UUID id, ProjectAdmin.ProjectInput in) {
        Project project = find(id);
        checkVersion(project, in.version());
        apply(project, in, id);
        if (project.status() == ProjectStatus.PUBLISHED) {
            // A published project must stay publishable.
            validatePublishable(project, in.translations().en() != null);
        }
        queries.replaceLinks(id, list(in.technologyIds()), list(in.galleryMediaIds()), list(in.expertiseAreaIds()));
        Project saved = projects.saveAndFlush(project);
        changed();
        return new ProjectAdmin.ProjectSaved(saved.id(), saved.version(), saved.status());
    }

    @Transactional
    public ProjectAdmin.ProjectSaved publish(UUID id) {
        Project project = find(id);
        validatePublishable(project, project.text("en") != null);
        return setStatus(project, ProjectStatus.PUBLISHED);
    }

    @Transactional
    public ProjectAdmin.ProjectSaved unpublish(UUID id) {
        return setStatus(find(id), ProjectStatus.DRAFT);
    }

    @Transactional
    public ProjectAdmin.ProjectSaved archive(UUID id) {
        return setStatus(find(id), ProjectStatus.ARCHIVED);
    }

    @Transactional
    public ProjectAdmin.ProjectSaved setFeatured(UUID id, long version, boolean featured) {
        Project project = find(id);
        checkVersion(project, version);
        project.setFeatured(featured);
        Project saved = projects.saveAndFlush(project);
        changed();
        return new ProjectAdmin.ProjectSaved(saved.id(), saved.version(), saved.status());
    }

    /** Deletes the project with its texts and links; media files stay in the library. */
    @Transactional
    public void delete(UUID id) {
        projects.delete(find(id));
        changed();
    }

    @Transactional
    public void reorder(List<UUID> ids) {
        queries.reorder(ids);
        changed();
    }

    @Transactional(readOnly = true)
    public boolean slugAvailable(String locale, String slug, UUID excludeId) {
        return queries.slugAvailable(locale, slug, excludeId);
    }

    @Transactional(readOnly = true)
    public long draftCount() {
        return queries.countByStatus(ProjectStatus.DRAFT.name());
    }

    /** Projects whose English version is missing or partial (dashboard). */
    @Transactional(readOnly = true)
    public List<TranslationGap> translationGaps() {
        return projects.findAll().stream()
                .filter(p -> p.status() != ProjectStatus.ARCHIVED)
                .map(p -> new TranslationGap(TranslationGap.Type.PROJECT, p.id(), p.text("pl").toTexts().title(), enStatus(p)))
                .filter(g -> g.status() != TranslationStatus.COMPLETE)
                .toList();
    }

    private ProjectAdmin.ProjectSaved setStatus(Project project, ProjectStatus status) {
        project.setStatus(status);
        Project saved = projects.saveAndFlush(project);
        changed();
        return new ProjectAdmin.ProjectSaved(saved.id(), saved.version(), saved.status());
    }

    private Project find(UUID id) {
        return projects.findById(id).orElseThrow(NotFoundException::new);
    }

    private static void checkVersion(Project project, long version) {
        if (project.version() != version) {
            throw new ConflictException("admin.errors.staleVersion");
        }
    }

    private void changed() {
        events.publishEvent(new ContentChangedEvent("projects"));
    }

    /** Draft rules (always), then copies the form into the entity. */
    private void apply(Project project, ProjectAdmin.ProjectInput in, UUID excludeId) {
        List<FieldProblem> problems = new ArrayList<>();
        ProjectAdmin.ProjectTexts pl = in.translations() == null ? null : in.translations().pl();
        ProjectAdmin.ProjectTexts en = in.translations() == null ? null : in.translations().en();
        if (pl == null) {
            problems.add(new FieldProblem("translations.pl.title", "admin.errors.required"));
            throw new ValidationException(problems);
        }
        require(problems, "translations.pl.title", pl.title());
        checkSlug(problems, "pl", pl.slug(), excludeId);
        if (en != null && isEmpty(en)) {
            en = null;
        }
        if (en != null) {
            requireEn(problems, "translations.en.title", en.title());
            requireEn(problems, "translations.en.summary", en.summary());
            if (blank(en.slug())) {
                problems.add(new FieldProblem("translations.en.slug", "admin.errors.enRequired"));
            } else {
                checkSlug(problems, "en", en.slug(), excludeId);
            }
            maxLength(problems, "translations.en.seoDescription", en.seoDescription());
        }
        maxLength(problems, "translations.pl.seoDescription", pl.seoDescription());
        checkUrl(problems, "repoUrl", in.repoUrl());
        checkUrl(problems, "liveUrl", in.liveUrl());
        if (in.startedOn() != null && in.finishedOn() != null && in.finishedOn().isBefore(in.startedOn())) {
            problems.add(new FieldProblem("finishedOn", "admin.errors.dateOrder"));
        }
        checkReferences(problems, "technologyIds", "technology", list(in.technologyIds()));
        checkReferences(problems, "galleryMediaIds", "media", list(in.galleryMediaIds()));
        checkReferences(problems, "expertiseAreaIds", "expertise_area", list(in.expertiseAreaIds()));
        if (in.coverMediaId() != null) {
            checkReferences(problems, "coverMediaId", "media", List.of(in.coverMediaId()));
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(en == null && in.translations().en() != null ? "admin.errors.enIncomplete"
                    : "problem.validation", problems);
        }
        project.edit(in, new ProjectText(pl), en == null ? null : new ProjectText(en));
    }

    private void validatePublishable(Project project, boolean hasEnglish) {
        List<FieldProblem> missing = new ArrayList<>();
        ProjectAdmin.ProjectTexts pl = project.text("pl").toTexts();
        require(missing, "translations.pl.summary", pl.summary());
        require(missing, "translations.pl.problemMd", pl.problemMd());
        require(missing, "translations.pl.solutionMd", pl.solutionMd());
        require(missing, "translations.pl.outcomeMd", pl.outcomeMd());
        if (project.startedOn() == null) {
            missing.add(new FieldProblem("startedOn", "admin.errors.required"));
        }
        // The cover is optional (every public view works without one), but a chosen one needs its alt texts.
        if (project.coverMediaId() != null) {
            if (blank(queries.altText(project.coverMediaId(), "pl"))) {
                missing.add(new FieldProblem("coverMediaId", "admin.errors.altMissing"));
            }
            if (hasEnglish && blank(queries.altText(project.coverMediaId(), "en"))) {
                missing.add(new FieldProblem("coverMediaId.en", "admin.errors.altMissing"));
            }
        }
        if (!missing.isEmpty()) {
            throw new ValidationException("admin.errors.publishMissing", missing);
        }
    }

    private void checkSlug(List<FieldProblem> problems, String locale, String slug, UUID excludeId) {
        String field = "translations." + locale + ".slug";
        if (blank(slug)) {
            problems.add(new FieldProblem(field, "admin.errors.required"));
        } else if (!Slugs.isValid(slug)) {
            problems.add(new FieldProblem(field, "admin.errors.slugFormat"));
        } else if (!queries.slugAvailable(locale, slug, excludeId)) {
            problems.add(new FieldProblem(field, "admin.errors.slugTaken"));
        }
    }

    private void checkReferences(List<FieldProblem> problems, String field, String table, List<UUID> ids) {
        List<UUID> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (queries.countExisting(table, distinct) != distinct.size()) {
            problems.add(new FieldProblem(field, "admin.errors.unknownReference"));
        }
    }

    private static void checkUrl(List<FieldProblem> problems, String field, String url) {
        if (!blank(url) && !url.strip().startsWith("https://")) {
            problems.add(new FieldProblem(field, "admin.errors.url"));
        }
    }

    private static void maxLength(List<FieldProblem> problems, String field, String value) {
        if (value != null && value.strip().length() > SEO_MAX) {
            problems.add(new FieldProblem(field, "admin.errors.tooLong", SEO_MAX));
        }
    }

    private static void require(List<FieldProblem> problems, String field, String value) {
        if (blank(value)) {
            problems.add(new FieldProblem(field, "admin.errors.required"));
        }
    }

    private static void requireEn(List<FieldProblem> problems, String field, String value) {
        if (blank(value)) {
            problems.add(new FieldProblem(field, "admin.errors.enRequired"));
        }
    }

    private static boolean isEmpty(ProjectAdmin.ProjectTexts t) {
        return Stream.of(t.slug(), t.title(), t.summary(), t.role(), t.problemMd(), t.solutionMd(), t.outcomeMd(),
                t.lessonsMd(), t.seoDescription()).allMatch(ProjectAdminService::blank);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static <T> List<T> list(List<T> values) {
        return values == null ? List.of() : values;
    }

    private ProjectAdmin.AdminProject view(Project p) {
        ProjectText en = p.text("en");
        return new ProjectAdmin.AdminProject(p.id(), p.version(), p.status(), p.kind(), p.featured(), p.startedOn(),
                p.finishedOn(), p.repoUrl(), p.liveUrl(), p.coverMediaId(), queries.galleryIds(p.id()),
                queries.technologyIds(p.id()), queries.areaIds(p.id()),
                new ProjectAdmin.ProjectTranslations(p.text("pl").toTexts(), en == null ? null : en.toTexts()));
    }

    static TranslationStatus enStatus(Project p) {
        ProjectText en = p.text("en");
        return TranslationStatus.of(fields(p.text("pl").toTexts()), en == null ? null : fields(en.toTexts()));
    }

    private static List<String> fields(ProjectAdmin.ProjectTexts t) {
        return Arrays.asList(t.title(), t.summary(), t.role(), t.problemMd(), t.solutionMd(), t.outcomeMd(),
                t.lessonsMd(), t.seoDescription());
    }
}
