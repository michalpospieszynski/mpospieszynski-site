package pl.mpospieszynski.site.projects.domain;

import java.util.Arrays;
import java.util.Optional;

public enum ProjectKind {
    CLIENT,
    PERSONAL,
    OPEN_SOURCE;

    /** Exact, language-neutral code from a query parameter; anything else is "no filter". */
    public static Optional<ProjectKind> parse(String code) {
        return code == null ? Optional.empty() : Arrays.stream(values()).filter(k -> k.name().equals(code)).findFirst();
    }
}
