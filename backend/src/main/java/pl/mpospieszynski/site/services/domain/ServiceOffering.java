package pl.mpospieszynski.site.services.domain;

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

/** A service offering with texts per language. */
@Entity
@Table(name = "service_offering")
public class ServiceOffering {

    @Embeddable
    public static class Text {

        @Column(nullable = false)
        private String title;

        @Column(nullable = false)
        private String summary;

        @Column(name = "description_md")
        private String descriptionMd;

        @Column(name = "deliverables_md")
        private String deliverablesMd;

        private String priceNote;

        protected Text() {
        }

        public Text(ServicesAdmin.ServiceTexts t) {
            title = t.title().strip();
            summary = t.summary().strip();
            descriptionMd = blankToNull(t.descriptionMd());
            deliverablesMd = blankToNull(t.deliverablesMd());
            priceNote = blankToNull(t.priceNote());
        }

        public ServicesAdmin.ServiceTexts toTexts() {
            return new ServicesAdmin.ServiceTexts(title, summary, descriptionMd, deliverablesMd, priceNote);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private boolean active = true;

    private int sortOrder;

    @Version
    private long version;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_translation", joinColumns = @JoinColumn(name = "service_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, Text> translations = new HashMap<>();

    protected ServiceOffering() {
    }

    public ServiceOffering(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void edit(boolean active, Text polish, Text english) {
        this.active = active;
        translations.put("pl", polish);
        if (english == null) {
            translations.remove("en");
        } else {
            translations.put("en", english);
        }
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public UUID id() {
        return id;
    }

    public boolean active() {
        return active;
    }

    public int sortOrder() {
        return sortOrder;
    }

    public long version() {
        return version;
    }

    public Text text(String locale) {
        return translations.get(locale);
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
