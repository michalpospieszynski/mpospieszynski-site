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

/** One FAQ entry with question and answer per language. */
@Entity
@Table(name = "faq")
public class Faq {

    @Embeddable
    public static class Text {

        @Column(nullable = false)
        private String question;

        @Column(name = "answer_md", nullable = false)
        private String answerMd;

        protected Text() {
        }

        public Text(ServicesAdmin.FaqTexts t) {
            question = t.question().strip();
            answerMd = t.answerMd().strip();
        }

        public ServicesAdmin.FaqTexts toTexts() {
            return new ServicesAdmin.FaqTexts(question, answerMd);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private int sortOrder;

    @Version
    private long version;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "faq_translation", joinColumns = @JoinColumn(name = "faq_id"))
    @MapKeyColumn(name = "locale")
    private Map<String, Text> translations = new HashMap<>();

    protected Faq() {
    }

    public Faq(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void edit(Text polish, Text english) {
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

    public Text text(String locale) {
        return translations.get(locale);
    }
}
