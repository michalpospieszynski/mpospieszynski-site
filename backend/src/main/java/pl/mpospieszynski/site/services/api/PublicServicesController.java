package pl.mpospieszynski.site.services.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.services.domain.ServicesCatalog;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.PublicCaching;

@RestController
@RequestMapping("/api/v1/public/services")
class PublicServicesController {

    /** GET /api/v1/public/services (docs/screens/public/06-services.md, Data). */
    record ServicesResponse(List<ServiceOffering> services, List<FaqItem> faq) {
    }

    /** `lang` is the language of the texts (Polish when the offering has no English version). */
    record ServiceOffering(UUID id, SiteLocale lang, String title, String summary, String descriptionMd,
                           String deliverablesMd, String priceNote) {
    }

    record FaqItem(UUID id, SiteLocale lang, String question, String answerMd) {
    }

    private final ServicesCatalog catalog;

    PublicServicesController(ServicesCatalog catalog) {
        this.catalog = catalog;
    }

    @Operation(operationId = "getPublicServices", summary = "Active service offerings and the FAQ")
    @GetMapping
    ResponseEntity<ServicesResponse> services(@RequestParam(defaultValue = "pl") SiteLocale lang) {
        ServicesCatalog.Services s = catalog.services(lang);
        ServicesResponse body = new ServicesResponse(
                s.services().stream().map(o -> new ServiceOffering(o.id(), o.lang(), o.title(), o.summary(),
                        o.descriptionMd(), o.deliverablesMd(), o.priceNote())).toList(),
                s.faq().stream().map(f -> new FaqItem(f.id(), f.lang(), f.question(), f.answerMd())).toList());
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(body);
    }
}
