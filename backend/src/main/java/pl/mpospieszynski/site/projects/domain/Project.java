package pl.mpospieszynski.site.projects.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * A project as the admin edits it: the row and its translations. Links (technologies, gallery, expertise areas)
 * are replaced with plain SQL by {@link ProjectAdminService}, because an ordered element collection would
 * briefly break the (project_id, media_id) key while reordering.
 */
@Entity
@Table(name = "project")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectKind kind = ProjectKind.CLIENT;

    private boolean featured;

    private int sortOrder;

    @Column(nullable = false)
    private LocalDate startedOn;

    private LocalDate finishedOn;

    private UUID coverMediaId;

    private String repoUrl;

    private String liveUrl;

    @Column(insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    @Version
    private long version;

    /** Keyed by locale code ("pl", "en"); Polish is always present. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_translation", joinColumns = @JoinColumn(name = "project_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, ProjectText> translations = new HashMap<>();

    protected Project() {
    }

    public static Project newDraft(int sortOrder) {
        Project project = new Project();
        project.sortOrder = sortOrder;
        project.startedOn = LocalDate.now();
        return project;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    /** Shared fields and texts from the editor; `english` null removes the English version. */
    public void edit(ProjectAdmin.ProjectInput in, ProjectText polish, ProjectText english) {
        kind = in.kind() == null ? ProjectKind.CLIENT : in.kind();
        featured = Boolean.TRUE.equals(in.featured());
        startedOn = in.startedOn() == null ? startedOn : in.startedOn();
        finishedOn = in.finishedOn();
        coverMediaId = in.coverMediaId();
        repoUrl = in.repoUrl();
        liveUrl = in.liveUrl();
        translations.put("pl", polish);
        if (english == null) {
            translations.remove("en");
        } else {
            translations.put("en", english);
        }
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }

    public UUID id() {
        return id;
    }

    public ProjectStatus status() {
        return status;
    }

    public ProjectKind kind() {
        return kind;
    }

    public boolean featured() {
        return featured;
    }

    public int sortOrder() {
        return sortOrder;
    }

    public LocalDate startedOn() {
        return startedOn;
    }

    public LocalDate finishedOn() {
        return finishedOn;
    }

    public UUID coverMediaId() {
        return coverMediaId;
    }

    public String repoUrl() {
        return repoUrl;
    }

    public String liveUrl() {
        return liveUrl;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }

    public long version() {
        return version;
    }

    public ProjectText text(String locale) {
        return translations.get(locale);
    }
}
