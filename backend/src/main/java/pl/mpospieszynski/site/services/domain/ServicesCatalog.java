package pl.mpospieszynski.site.services.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.services.infra.PublicServicesQueries;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** Active offerings and the FAQ (docs/screens/public/06-services.md). */
@Service
public class ServicesCatalog {

    static final String CACHE = "public-services";

    public record Offering(UUID id, SiteLocale lang, String title, String summary, String descriptionMd,
                           String deliverablesMd, String priceNote) {
    }

    public record Question(UUID id, SiteLocale lang, String question, String answerMd) {
    }

    public record Services(List<Offering> services, List<Question> faq) {
    }

    private final PublicServicesQueries queries;

    public ServicesCatalog(PublicServicesQueries queries) {
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CACHE, key = "#lang")
    public Services services(SiteLocale lang) {
        return new Services(
                queries.activeServices(lang).stream()
                        .map(s -> new Offering(s.id(), locale(s.textLocale()), s.title(), s.summary(), s.descriptionMd(),
                                s.deliverablesMd(), s.priceNote()))
                        .toList(),
                queries.faq(lang).stream()
                        .map(f -> new Question(f.id(), locale(f.textLocale()), f.question(), f.answerMd()))
                        .toList());
    }

    private static SiteLocale locale(String code) {
        return SiteLocale.fromCode(code).orElse(SiteLocale.DEFAULT);
    }
}
