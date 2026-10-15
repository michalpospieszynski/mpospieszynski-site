package pl.mpospieszynski.site.services.domain;

import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;

/** What the admin services and FAQ screen exchanges (docs/screens/admin/08-services-faq.md). */
public final class ServicesAdmin {

    private ServicesAdmin() {
    }

    public record ServiceTexts(String title, String summary, String descriptionMd, String deliverablesMd,
                               String priceNote) {
    }

    public record ServiceTranslations(ServiceTexts pl, ServiceTexts en) {
    }

    public record ServiceInput(long version, Boolean active, ServiceTranslations translations) {
    }

    public record AdminService(UUID id, long version, boolean active, int sortOrder, TranslationStatus enStatus,
                               ServiceTranslations translations) {
    }

    public record FaqTexts(String question, String answerMd) {
    }

    public record FaqTranslations(FaqTexts pl, FaqTexts en) {
    }

    public record FaqInput(long version, FaqTranslations translations) {
    }

    public record AdminFaq(UUID id, long version, int sortOrder, TranslationStatus enStatus, FaqTranslations translations) {
    }
}
