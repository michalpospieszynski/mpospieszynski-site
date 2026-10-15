package pl.mpospieszynski.site.shared.i18n;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import org.springframework.web.servlet.LocaleResolver;

/**
 * Error and validation messages follow the `lang` query parameter on the public API (default Polish): an explicit
 * parameter caches better than Accept-Language. Admin endpoints use `lang` for the content language (e.g. the
 * preview), so their messages follow the admin's UI language instead, which its client sends as Accept-Language.
 */
public class LangParamLocaleResolver implements LocaleResolver {

    private static final String ADMIN_API = "/api/v1/admin/";

    @Override
    public Locale resolveLocale(HttpServletRequest request) {
        if (request.getRequestURI().startsWith(ADMIN_API)) {
            String header = request.getHeader("Accept-Language");
            String language = header == null || header.isBlank() ? null : request.getLocale().getLanguage();
            return SiteLocale.fromCode(language).orElse(SiteLocale.DEFAULT).locale();
        }
        return SiteLocale.fromCode(request.getParameter("lang")).orElse(SiteLocale.DEFAULT).locale();
    }

    @Override
    public void setLocale(HttpServletRequest request, HttpServletResponse response, Locale locale) {
        throw new UnsupportedOperationException("The language comes from the lang parameter or, for the admin, Accept-Language.");
    }
}
