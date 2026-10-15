package pl.mpospieszynski.site.skills.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.skills.infra.PublicSkillsQueries;
import pl.mpospieszynski.site.skills.infra.PublicSkillsQueries.AreaProjectRow;
import pl.mpospieszynski.site.skills.infra.PublicSkillsQueries.AreaTechnologyRow;
import pl.mpospieszynski.site.skills.infra.PublicSkillsQueries.TechnologyRow;

/** Expertise areas with their evidence, and technologies by category, for the skills and home pages. */
@Service
public class SkillsCatalog {

    static final String CACHE = "public-skills";

    private final PublicSkillsQueries queries;

    public SkillsCatalog(PublicSkillsQueries queries) {
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CACHE, key = "#lang")
    public Skills skills(SiteLocale lang) {
        Map<UUID, List<Skills.TechnologyRef>> areaTechnologies = queries.areaTechnologies().stream()
                .collect(Collectors.groupingBy(AreaTechnologyRow::areaId,
                        Collectors.mapping(t -> new Skills.TechnologyRef(t.slug(), t.name()), Collectors.toList())));
        Map<UUID, List<Skills.ProjectRef>> areaProjects = queries.areaProjects(lang).stream()
                .collect(Collectors.groupingBy(AreaProjectRow::areaId,
                        Collectors.mapping(p -> new Skills.ProjectRef(p.slug(), locale(p.textLocale()), p.title()),
                                Collectors.toList())));

        List<Skills.Area> areas = queries.areas(lang).stream()
                .map(a -> new Skills.Area(a.id(), locale(a.textLocale()), a.title(), a.summary(), a.descriptionMd(),
                        areaTechnologies.getOrDefault(a.id(), List.of()), areaProjects.getOrDefault(a.id(), List.of())))
                .toList();

        Map<String, List<TechnologyRow>> byCategory = queries.technologies(lang).stream()
                .collect(Collectors.groupingBy(TechnologyRow::category));
        List<Skills.Category> categories = Arrays.stream(TechnologyCategory.values())
                .filter(c -> byCategory.containsKey(c.name()))
                .map(c -> new Skills.Category(c, byCategory.get(c.name()).stream().map(SkillsCatalog::technology).toList()))
                .toList();

        return new Skills(areas, categories);
    }

    private static Skills.Technology technology(TechnologyRow t) {
        return new Skills.Technology(t.slug(), t.name(), t.description(),
                t.descriptionLocale() == null ? null : locale(t.descriptionLocale()), t.sinceYear(), t.projectCount());
    }

    private static SiteLocale locale(String code) {
        return SiteLocale.fromCode(code).orElse(SiteLocale.DEFAULT);
    }
}
