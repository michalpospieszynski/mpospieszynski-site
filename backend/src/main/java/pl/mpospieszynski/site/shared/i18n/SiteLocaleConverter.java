package pl.mpospieszynski.site.shared.i18n;

import org.springframework.core.convert.converter.Converter;

/** Binds `?lang=pl|en` to {@link SiteLocale}; any other value is a 400 (see ProblemDetailAdvice). */
public class SiteLocaleConverter implements Converter<String, SiteLocale> {

    @Override
    public SiteLocale convert(String source) {
        return SiteLocale.fromCode(source)
                .orElseThrow(() -> new IllegalArgumentException("Unsupported language: " + source));
    }
}
