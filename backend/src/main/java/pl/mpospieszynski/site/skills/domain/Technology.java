package pl.mpospieszynski.site.skills.domain;

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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** A technology with its "how I use it" description per language (docs/screens/admin/07-skills.md). */
@Entity
@Table(name = "technology")
public class Technology {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TechnologyCategory category;

    @Column(name = "show_on_skills_page", nullable = false)
    private boolean showOnSkillsPage = true;

    private Short sinceYear;

    private int sortOrder;

    @Version
    private long version;

    /** Description keyed by locale; no row at all when there is no description. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "technology_translation", joinColumns = @JoinColumn(name = "technology_id"))
    @MapKeyColumn(name = "locale")
    @Column(name = "description", nullable = false)
    private Map<String, String> descriptions = new HashMap<>();

    protected Technology() {
    }

    public Technology(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void edit(String slug, String name, TechnologyCategory category, boolean showOnSkillsPage, Short sinceYear,
                     String descriptionPl, String descriptionEn) {
        this.slug = slug;
        this.name = name;
        this.category = category;
        this.showOnSkillsPage = showOnSkillsPage;
        this.sinceYear = sinceYear;
        put("pl", descriptionPl);
        put("en", descriptionEn);
    }

    private void put(String locale, String text) {
        if (text == null || text.isBlank()) {
            descriptions.remove(locale);
        } else {
            descriptions.put(locale, text.strip());
        }
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public UUID id() {
        return id;
    }

    public String slug() {
        return slug;
    }

    public String name() {
        return name;
    }

    public TechnologyCategory category() {
        return category;
    }

    public boolean showOnSkillsPage() {
        return showOnSkillsPage;
    }

    public Short sinceYear() {
        return sinceYear;
    }

    public int sortOrder() {
        return sortOrder;
    }

    public long version() {
        return version;
    }

    public String description(String locale) {
        return descriptions.get(locale);
    }
}
