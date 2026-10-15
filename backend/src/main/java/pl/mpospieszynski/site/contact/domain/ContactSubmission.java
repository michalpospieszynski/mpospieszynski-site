package pl.mpospieszynski.site.contact.domain;

import java.util.Set;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** A contact form submission as the service receives it (fields not yet validated). */
public record ContactSubmission(
        SiteLocale locale,
        String topic,
        String name,
        String email,
        String company,
        UUID serviceId,
        String budgetRange,
        String timeline,
        String message,
        boolean consent,
        String turnstileToken,
        String website) {

    public static final String PROJECT = "PROJECT";
    public static final Set<String> TOPICS = Set.of(PROJECT, "CONSULTATION", "OTHER");
    /** Option codes; the labels live in the frontend translations (contact.budget.*, contact.timeline.*). */
    public static final Set<String> BUDGETS = Set.of("UNSURE", "SMALL", "MEDIUM", "LARGE", "XLARGE");
    public static final Set<String> TIMELINES = Set.of("UNSURE", "ASAP", "QUARTER", "LATER");
}
