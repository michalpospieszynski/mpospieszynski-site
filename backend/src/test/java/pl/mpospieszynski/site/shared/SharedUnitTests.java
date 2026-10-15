package pl.mpospieszynski.site.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import pl.mpospieszynski.site.shared.i18n.Localized;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.i18n.Translations;
import pl.mpospieszynski.site.shared.web.ClientIpResolver;
import pl.mpospieszynski.site.shared.web.IpHasher;

class SharedUnitTests {

    @Test
    void parsesLanguagesLeniently() {
        assertThat(SiteLocale.fromCode("pl")).contains(SiteLocale.PL);
        assertThat(SiteLocale.fromCode(" EN ")).contains(SiteLocale.EN);
        assertThat(SiteLocale.fromCode("de")).isEmpty();
        assertThat(SiteLocale.fromCode(null)).isEmpty();
    }

    @Test
    void picksTheRequestedTranslationOrFallsBackToPolish() {
        Map<SiteLocale, String> both = Map.of(SiteLocale.PL, "Projekty", SiteLocale.EN, "Projects");
        Map<SiteLocale, String> polishOnly = Map.of(SiteLocale.PL, "Raporty");

        assertThat(Translations.pick(both, SiteLocale.EN)).contains(new Localized<>("Projects", SiteLocale.EN));
        Localized<String> fallback = Translations.pick(polishOnly, SiteLocale.EN).orElseThrow();
        assertThat(fallback).isEqualTo(new Localized<>("Raporty", SiteLocale.PL));
        assertThat(fallback.isFallbackFor(SiteLocale.EN)).isTrue();
        assertThat(Translations.pick(Map.<SiteLocale, String>of(), SiteLocale.EN)).isEmpty();
    }

    @Test
    void takesTheClientIpFromCloudflareOrTheSocket() {
        ClientIpResolver resolver = new ClientIpResolver();
        MockHttpServletRequest viaCloudflare = new MockHttpServletRequest();
        viaCloudflare.addHeader("CF-Connecting-IP", " 203.0.113.7 ");
        viaCloudflare.setRemoteAddr("172.18.0.3");
        MockHttpServletRequest local = new MockHttpServletRequest();
        local.setRemoteAddr("127.0.0.1");

        assertThat(resolver.resolve(viaCloudflare)).isEqualTo("203.0.113.7");
        assertThat(resolver.resolve(local)).isEqualTo("127.0.0.1");
    }

    @Test
    void hashesIpsWithTheSalt() {
        IpHasher hasher = new IpHasher("salt-a");
        String hash = hasher.hash("203.0.113.7");

        assertThat(hash).hasSize(64).doesNotContain("203.0.113.7");
        assertThat(hasher.hash("203.0.113.7")).isEqualTo(hash);
        assertThat(hasher.hash("203.0.113.8")).isNotEqualTo(hash);
        assertThat(new IpHasher("salt-b").hash("203.0.113.7")).isNotEqualTo(hash);
        assertThatThrownBy(() -> new IpHasher(" ")).isInstanceOf(IllegalStateException.class);
    }
}
