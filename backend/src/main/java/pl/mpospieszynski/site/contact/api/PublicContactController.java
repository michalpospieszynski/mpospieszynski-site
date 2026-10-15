package pl.mpospieszynski.site.contact.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.contact.domain.ContactService;
import pl.mpospieszynski.site.contact.domain.ContactSubmission;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.ClientIpResolver;

@RestController
@RequestMapping("/api/v1/public/contact")
class PublicContactController {

    /** POST /api/v1/public/contact (docs/screens/public/08-contact.md, Data). */
    record ContactRequest(
            SiteLocale locale,
            @Schema(allowableValues = {"PROJECT", "CONSULTATION", "OTHER"}) String topic,
            String name,
            String email,
            String company,
            UUID serviceId,
            @Schema(allowableValues = {"UNSURE", "SMALL", "MEDIUM", "LARGE", "XLARGE"}) String budgetRange,
            @Schema(allowableValues = {"UNSURE", "ASAP", "QUARTER", "LATER"}) String timeline,
            String message,
            boolean consent,
            String turnstileToken,
            @Schema(description = "Honeypot: must stay empty") String website) {
    }

    record ContactAccepted(UUID id) {
    }

    private final ContactService contacts;
    private final ClientIpResolver ips;

    PublicContactController(ContactService contacts, ClientIpResolver ips) {
        this.contacts = contacts;
        this.ips = ips;
    }

    @Operation(operationId = "submitContactMessage",
            summary = "Contact form: 202, 400 with field errors, 403 bot check failed, 429 rate limited")
    @PostMapping
    ResponseEntity<ContactAccepted> submit(@RequestBody ContactRequest body, HttpServletRequest request) {
        SiteLocale locale = body.locale() == null ? SiteLocale.DEFAULT : body.locale();
        // Field errors and problem details come back in the form's language.
        LocaleContextHolder.setLocale(locale.locale());
        UUID id = contacts.submit(new ContactSubmission(locale, body.topic(), body.name(), body.email(), body.company(),
                body.serviceId(), body.budgetRange(), body.timeline(), body.message(), body.consent(),
                body.turnstileToken(), body.website()), ips.resolve(request));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new ContactAccepted(id));
    }
}
