package pl.mpospieszynski.site.projects.domain;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.projects.infra.PublicProjectQueries;
import pl.mpospieszynski.site.projects.infra.PublicProjectQueries.DetailRow;
import pl.mpospieszynski.site.projects.infra.PublicProjectQueries.NeighbourRow;
import pl.mpospieszynski.site.projects.infra.PublicProjectQueries.ProjectRow;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.storage.MediaRef;
import pl.mpospieszynski.site.shared.web.NotFoundException;

/** Published projects for the public pages (docs/screens/public/03-projects-list.md). */
@Service
public class ProjectCatalog {

    static final String LIST_CACHE = "public-projects";
    static final String DETAIL_CACHE = "public-project";

    private final PublicProjectQueries queries;

    public ProjectCatalog(PublicProjectQueries queries) {
        this.queries = queries;
    }

    /**
     * Published projects, featured first. A null filter is not applied; an unknown technology slug is treated
     * as no filter (the spec ignores unknown query values rather than showing an empty page).
     */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = LIST_CACHE, key = "#lang + ':' + #kind + ':' + #technology + ':' + #featured")
    public List<ProjectSummary> list(SiteLocale lang, ProjectKind kind, String technology, Boolean featured) {
        String tech = technology != null && queries.technologyExists(technology) ? technology : null;
        List<ProjectRow> rows = queries.list(lang, kind == null ? null : kind.name(), tech, featured);
        Map<UUID, List<ProjectSummary.TechnologyRef>> technologies = queries
                .technologies(rows.stream().map(ProjectRow::id).toList()).stream()
                .collect(Collectors.groupingBy(PublicProjectQueries.TechnologyRow::projectId,
                        Collectors.mapping(t -> new ProjectSummary.TechnologyRef(t.slug(), t.name()), Collectors.toList())));
        return rows.stream().map(row -> summary(row, technologies.getOrDefault(row.id(), List.of()))).toList();
    }

    /**
     * The case study published under `slug` in `lang`; 404 otherwise (slugs are per language, so an English URL
     * never shows Polish text). Previous/next stay within projects that have a text in `lang`, without wrapping.
     */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = DETAIL_CACHE, key = "#lang + ':' + #slug")
    public ProjectCase detail(SiteLocale lang, String slug) {
        return toCase(lang, queries.detail(lang, slug).orElseThrow(NotFoundException::new));
    }

    /** The admin preview: any status, by id, never cached (docs/screens/admin/06-project-editor.md). */
    @Transactional(readOnly = true)
    public ProjectCase preview(SiteLocale lang, UUID id) {
        return toCase(lang, queries.detailById(lang, id).orElseThrow(NotFoundException::new));
    }

    private ProjectCase toCase(SiteLocale lang, DetailRow row) {
        List<ProjectSummary.TechnologyRef> technologies = queries.technologies(List.of(row.id())).stream()
                .map(t -> new ProjectSummary.TechnologyRef(t.slug(), t.name())).toList();
        MediaRef cover = row.coverKey() == null ? null
                : new MediaRef(MediaRef.urlFor(row.coverKey()), row.coverAlt(), row.coverWidth(), row.coverHeight());
        ProjectSummary summary = new ProjectSummary(row.id(), lang, row.slug(), row.plSlug(), row.enSlug(),
                row.title(), row.summary(), row.role(), ProjectKind.valueOf(row.kind()), row.featured(),
                row.startedOn(), row.finishedOn(), cover, technologies);
        List<ProjectCase.GalleryImage> gallery = queries.gallery(row.id(), lang).stream()
                .map(g -> new ProjectCase.GalleryImage(MediaRef.urlFor(g.storageKey()), g.altText(), g.caption(),
                        g.width(), g.height()))
                .toList();

        List<NeighbourRow> sequence = queries.sequence(lang);
        int index = sequence.stream().map(NeighbourRow::id).toList().indexOf(row.id());
        ProjectCase.Neighbour previous = index > 0 ? neighbour(sequence.get(index - 1)) : null;
        ProjectCase.Neighbour next = index >= 0 && index < sequence.size() - 1 ? neighbour(sequence.get(index + 1)) : null;

        return new ProjectCase(summary, row.problemMd(), row.solutionMd(), row.outcomeMd(), row.lessonsMd(),
                row.seoDescription(), row.repoUrl(), row.liveUrl(), gallery, previous, next);
    }

    private static ProjectCase.Neighbour neighbour(NeighbourRow row) {
        return new ProjectCase.Neighbour(row.slug(), row.title());
    }

    private static ProjectSummary summary(ProjectRow row, List<ProjectSummary.TechnologyRef> technologies) {
        MediaRef cover = row.coverKey() == null ? null
                : new MediaRef(MediaRef.urlFor(row.coverKey()), row.coverAlt(), row.coverWidth(), row.coverHeight());
        return new ProjectSummary(row.id(), SiteLocale.fromCode(row.textLocale()).orElse(SiteLocale.DEFAULT),
                row.slug(), row.plSlug(), row.enSlug(), row.title(), row.summary(), row.role(),
                ProjectKind.valueOf(row.kind()), row.featured(), row.startedOn(), row.finishedOn(), cover, technologies);
    }
}
