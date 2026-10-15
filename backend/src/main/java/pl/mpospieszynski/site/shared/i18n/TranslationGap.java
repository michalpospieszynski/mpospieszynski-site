package pl.mpospieszynski.site.shared.i18n;

import java.util.UUID;

/**
 * A record whose English version is missing or incomplete, for the admin dashboard. Each feature reports its own
 * gaps through a service, so the dashboard never reads another feature's tables.
 */
public record TranslationGap(Type type, UUID id, String label, TranslationStatus status) {

    public enum Type { PROJECT, SERVICE, FAQ, TECHNOLOGY, EXPERTISE_AREA, SETTINGS, MEDIA }
}
