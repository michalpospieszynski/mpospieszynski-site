package pl.mpospieszynski.site.shared.web;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import pl.mpospieszynski.site.shared.i18n.LangParamLocaleResolver;
import pl.mpospieszynski.site.shared.i18n.SiteLocaleConverter;

@Configuration
class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new SiteLocaleConverter());
    }

    /** Must be named "localeResolver" for Spring MVC to use it. */
    @Bean(name = "localeResolver")
    LocaleResolver localeResolver() {
        return new LangParamLocaleResolver();
    }
}
