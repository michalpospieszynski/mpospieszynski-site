package pl.mpospieszynski.site.profile.domain;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.profile.infra.ProfileLookups;
import pl.mpospieszynski.site.profile.infra.SiteSettingsRepository;
import pl.mpospieszynski.site.shared.i18n.Localized;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.i18n.Translations;
import pl.mpospieszynski.site.shared.storage.MediaRef;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Service
public class ProfileService {

    static final String CACHE = "public-profile";

    private final SiteSettingsRepository settings;
    private final ProfileLookups lookups;
    private final JsonMapper json;

    public ProfileService(SiteSettingsRepository settings, ProfileLookups lookups, JsonMapper json) {
        this.settings = settings;
        this.lookups = lookups;
        this.json = json;
    }

    /** The profile in `lang`, falling back to Polish texts; `lang` in the result is the language actually returned. */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CACHE, key = "#lang")
    public Profile publicProfile(SiteLocale lang) {
        SiteSettings s = settings.findById(SiteSettingsRepository.SETTINGS_ID).orElseThrow(NotFoundException::new);
        Map<SiteLocale, SiteSettingsText> texts = new LinkedHashMap<>();
        s.translations().forEach((code, text) -> SiteLocale.fromCode(code).ifPresent(l -> texts.put(l, text)));
        Localized<SiteSettingsText> text = Translations.pick(texts, lang).orElseThrow(NotFoundException::new);

        Profile.Portrait portrait = s.portraitMediaId() == null ? null : lookups.portrait(s.portraitMediaId(), lang)
                .map(p -> new Profile.Portrait(MediaRef.urlFor(p.storageKey()), p.altText(), p.width(), p.height()))
                .orElse(null);
        Profile.SiteProject siteProject = s.siteProjectId() == null ? null : lookups.publishedProjectSlug(s.siteProjectId(), lang)
                .map(row -> new Profile.SiteProject(row.slug(), SiteLocale.fromCode(row.locale()).orElse(SiteLocale.DEFAULT)))
                .orElse(null);

        SiteSettingsText t = text.value();
        return new Profile(text.lang(), s.fullName(), t.headline(), t.introMd(), t.aboutMd(), t.approachMd(), t.locationLabel(),
                s.availability(), s.availableFrom(), s.showAvailability(), socialLinks(s.socialLinksJson()), portrait, siteProject);
    }

    private Map<String, String> socialLinks(String rawJson) {
        return rawJson == null || rawJson.isBlank() ? Map.of() : json.readValue(rawJson, new TypeReference<Map<String, String>>() { });
    }
}
