package pl.mpospieszynski.site.profile.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The single settings row (id = 1): who the owner is and how the site introduces them, per language. */
@Entity
@Table(name = "site_settings")
public class SiteSettings {

    public enum Availability { OPEN, LIMITED, CLOSED }

    @Id
    private Short id;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Availability availability;

    private LocalDate availableFrom;

    private boolean showAvailability;

    /** JSON object of link name to URL, e.g. {"github": "https://github.com/..."}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "social_links", nullable = false)
    private String socialLinksJson;

    private UUID portraitMediaId;

    private UUID siteProjectId;

    @Version
    private long version;

    /** Keyed by locale code ("pl", "en"). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "site_settings_translation", joinColumns = @JoinColumn(name = "settings_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, SiteSettingsText> translations = new HashMap<>();

    protected SiteSettings() {
    }

    /** Everything the settings screen edits; `english` null removes the English version. */
    public void edit(String fullName, Availability availability, LocalDate availableFrom, boolean showAvailability,
                     String socialLinksJson, UUID portraitMediaId, UUID siteProjectId, SiteSettingsText polish,
                     SiteSettingsText english) {
        this.fullName = fullName;
        this.availability = availability;
        this.availableFrom = availableFrom;
        this.showAvailability = showAvailability;
        this.socialLinksJson = socialLinksJson;
        this.portraitMediaId = portraitMediaId;
        this.siteProjectId = siteProjectId;
        translations.put("pl", polish);
        if (english == null) {
            translations.remove("en");
        } else {
            translations.put("en", english);
        }
    }

    public long version() {
        return version;
    }

    public String fullName() {
        return fullName;
    }

    public Availability availability() {
        return availability;
    }

    public LocalDate availableFrom() {
        return availableFrom;
    }

    public boolean showAvailability() {
        return showAvailability;
    }

    public String socialLinksJson() {
        return socialLinksJson;
    }

    public UUID portraitMediaId() {
        return portraitMediaId;
    }

    public UUID siteProjectId() {
        return siteProjectId;
    }

    public Map<String, SiteSettingsText> translations() {
        return Map.copyOf(translations);
    }
}
