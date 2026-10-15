package pl.mpospieszynski.site.skills.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
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

/** An area of expertise with texts per language; its technology and project links are kept with plain SQL. */
@Entity
@Table(name = "expertise_area")
public class ExpertiseArea {

    @Embeddable
    public static class AreaText {

        @Column(nullable = false)
        private String title;

        @Column(nullable = false)
        private String summary;

        @Column(name = "description_md")
        private String descriptionMd;

        protected AreaText() {
        }

        public AreaText(SkillsAdmin.AreaTexts texts) {
            this.title = texts.title().strip();
            this.summary = texts.summary().strip();
            this.descriptionMd = texts.descriptionMd() == null || texts.descriptionMd().isBlank() ? null : texts.descriptionMd();
        }

        public SkillsAdmin.AreaTexts toTexts() {
            return new SkillsAdmin.AreaTexts(title, summary, descriptionMd);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String icon;

    private int sortOrder;

    @Version
    private long version;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "expertise_area_translation", joinColumns = @JoinColumn(name = "area_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, AreaText> translations = new HashMap<>();

    protected ExpertiseArea() {
    }

    public ExpertiseArea(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void edit(AreaText polish, AreaText english) {
        translations.put("pl", polish);
        if (english == null) {
            translations.remove("en");
        } else {
            translations.put("en", english);
        }
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public UUID id() {
        return id;
    }

    public int sortOrder() {
        return sortOrder;
    }

    public long version() {
        return version;
    }

    public AreaText text(String locale) {
        return translations.get(locale);
    }
}
