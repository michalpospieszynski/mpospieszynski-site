package pl.mpospieszynski.site.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One language's texts of a project (table project_translation). Draft texts may be empty strings. */
@Embeddable
public class ProjectText {

    @Column(nullable = false)
    private String slug;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String summary;

    private String role;

    @Column(name = "problem_md", nullable = false)
    private String problemMd;

    @Column(name = "solution_md", nullable = false)
    private String solutionMd;

    @Column(name = "outcome_md", nullable = false)
    private String outcomeMd;

    @Column(name = "lessons_md")
    private String lessonsMd;

    private String seoDescription;

    protected ProjectText() {
    }

    public ProjectText(ProjectAdmin.ProjectTexts t) {
        this.slug = t.slug();
        this.title = t.title();
        this.summary = orEmpty(t.summary());
        this.role = blankToNull(t.role());
        this.problemMd = orEmpty(t.problemMd());
        this.solutionMd = orEmpty(t.solutionMd());
        this.outcomeMd = orEmpty(t.outcomeMd());
        this.lessonsMd = blankToNull(t.lessonsMd());
        this.seoDescription = blankToNull(t.seoDescription());
    }

    public ProjectAdmin.ProjectTexts toTexts() {
        return new ProjectAdmin.ProjectTexts(slug, title, summary, role, problemMd, solutionMd, outcomeMd, lessonsMd, seoDescription);
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value.strip();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
