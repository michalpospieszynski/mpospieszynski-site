package pl.mpospieszynski.site.projects.domain;

import java.util.List;

/** A published case study in one language (docs/screens/public/04-project-detail.md, Data). */
public record ProjectCase(
        ProjectSummary summary,
        String problemMd,
        String solutionMd,
        String outcomeMd,
        String lessonsMd,
        String seoDescription,
        String repoUrl,
        String liveUrl,
        List<GalleryImage> gallery,
        Neighbour previous,
        Neighbour next) {

    public record GalleryImage(String url, String alt, String caption, Integer width, Integer height) {
    }

    public record Neighbour(String slug, String title) {
    }
}
