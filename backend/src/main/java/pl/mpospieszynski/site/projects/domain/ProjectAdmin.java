package pl.mpospieszynski.site.projects.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;

/**
 * What the admin project screens exchange (docs/screens/admin/05-projects-list.md, 06-project-editor.md):
 * shared fields once, texts per language, English optional as a whole.
 */
public final class ProjectAdmin {

    private ProjectAdmin() {
    }

    /** One language's texts. */
    public record ProjectTexts(String slug, String title, String summary, String role, String problemMd, String solutionMd,
                        String outcomeMd, String lessonsMd, String seoDescription) {
    }

    public record ProjectTranslations(ProjectTexts pl, ProjectTexts en) {
    }

    /** The editor's form; `version` is the one the editor loaded (0 for a new project). */
    public record ProjectInput(long version, ProjectKind kind, Boolean featured, LocalDate startedOn, LocalDate finishedOn,
                        String repoUrl, String liveUrl, UUID coverMediaId, List<UUID> galleryMediaIds,
                        List<UUID> technologyIds, List<UUID> expertiseAreaIds, ProjectTranslations translations) {
    }

    /** A project as the editor loads it. */
    public record AdminProject(UUID id, long version, ProjectStatus status, ProjectKind kind, boolean featured,
                          LocalDate startedOn, LocalDate finishedOn, String repoUrl, String liveUrl, UUID coverMediaId,
                          List<UUID> galleryMediaIds, List<UUID> technologyIds, List<UUID> expertiseAreaIds,
                          ProjectTranslations translations) {
    }

    /** A row of the admin list. */
    public record AdminProjectListItem(UUID id, long version, String titlePl, ProjectStatus status, boolean featured,
                           TranslationStatus enStatus, int sortOrder, OffsetDateTime updatedAt) {
    }

    /** Result of a create or save: what the editor needs to continue. */
    public record ProjectSaved(UUID id, long version, ProjectStatus status) {
    }
}
