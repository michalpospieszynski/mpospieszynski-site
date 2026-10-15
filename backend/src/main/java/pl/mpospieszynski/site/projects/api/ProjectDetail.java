package pl.mpospieszynski.site.projects.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.projects.api.ProjectListItem.SlugTranslations;
import pl.mpospieszynski.site.projects.api.ProjectListItem.TechnologyTag;
import pl.mpospieszynski.site.projects.domain.ProjectCase;
import pl.mpospieszynski.site.projects.domain.ProjectKind;
import pl.mpospieszynski.site.projects.domain.ProjectSummary;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.storage.MediaRef;

/** GET /api/v1/public/projects/{slug} (docs/screens/public/04-project-detail.md, Data): a list item plus the story. */
public record ProjectDetail(
        UUID id,
        SiteLocale lang,
        String slug,
        SlugTranslations translations,
        String title,
        String summary,
        String role,
        ProjectKind kind,
        boolean featured,
        LocalDate startedOn,
        LocalDate finishedOn,
        MediaRef cover,
        List<TechnologyTag> technologies,
        String problemMd,
        String solutionMd,
        String outcomeMd,
        String lessonsMd,
        String seoDescription,
        String repoUrl,
        String liveUrl,
        List<GalleryImage> gallery,
        ProjectLink previous,
        ProjectLink next) {

    public record GalleryImage(String url, String alt, String caption, Integer width, Integer height) {
    }

    /** A neighbouring case study in the same language. */
    public record ProjectLink(String slug, String title) {
    }

    static ProjectDetail from(ProjectCase c) {
        ProjectSummary p = c.summary();
        return new ProjectDetail(p.id(), p.lang(), p.slug(), new SlugTranslations(p.plSlug(), p.enSlug()),
                p.title(), p.summary(), p.role(), p.kind(), p.featured(), p.startedOn(), p.finishedOn(), p.cover(),
                p.technologies().stream().map(t -> new TechnologyTag(t.slug(), t.name())).toList(),
                c.problemMd(), c.solutionMd(), c.outcomeMd(), c.lessonsMd(), c.seoDescription(), c.repoUrl(), c.liveUrl(),
                c.gallery().stream().map(g -> new GalleryImage(g.url(), g.alt(), g.caption(), g.width(), g.height())).toList(),
                link(c.previous()), link(c.next()));
    }

    private static ProjectLink link(ProjectCase.Neighbour n) {
        return n == null ? null : new ProjectLink(n.slug(), n.title());
    }
}
