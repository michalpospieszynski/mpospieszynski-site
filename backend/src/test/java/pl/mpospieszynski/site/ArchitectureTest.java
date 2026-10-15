package pl.mpospieszynski.site;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Package rules of the modular monolith (docs/CONVENTIONS.md § 4): features depend on {@code shared},
 * never on each other's {@code infra} or entities; inside a feature, {@code domain} and {@code infra}
 * never depend on {@code api}.
 */
@AnalyzeClasses(packages = ArchitectureTest.ROOT, importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    static final String ROOT = "pl.mpospieszynski.site";
    static final List<String> FEATURES = List.of("profile", "projects", "skills", "services", "contact", "seo", "media", "dashboard");

    @ArchTest
    static final ArchRule onlyKnownTopLevelPackages = classes()
            .should().resideInAnyPackage(knownPackages())
            .as("classes live in the root package, shared, or one of the features " + FEATURES);

    @ArchTest
    static final ArchRule sharedDoesNotDependOnFeatures = noClasses()
            .that().resideInAPackage(ROOT + ".shared..")
            .should().dependOnClassesThat().resideInAnyPackage(featurePackages())
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule domainDoesNotDependOnApi = noClasses()
            .that().resideInAPackage(ROOT + ".*.domain..")
            .should().dependOnClassesThat().resideInAPackage(ROOT + ".*.api..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule infraDoesNotDependOnApi = noClasses()
            .that().resideInAPackage(ROOT + ".*.infra..")
            .should().dependOnClassesThat().resideInAPackage(ROOT + ".*.api..")
            .allowEmptyShould(true);

    @ArchTest
    static void featureInternalsStayInsideTheFeature(JavaClasses classes) {
        for (String feature : FEATURES) {
            String pkg = ROOT + "." + feature + "..";
            classes().that().resideInAPackage(ROOT + "." + feature + ".infra..")
                    .should().onlyHaveDependentClassesThat().resideInAPackage(pkg)
                    .allowEmptyShould(true)
                    .check(classes);
            classes().that().resideInAPackage(pkg).and().areAnnotatedWith("jakarta.persistence.Entity")
                    .should().onlyHaveDependentClassesThat().resideInAPackage(pkg)
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    /** The operationId becomes the generated Angular client's method name (docs/CONVENTIONS.md § 4, Controllers). */
    @ArchTest
    static final ArchRule endpointsDeclareAnOperationId = methods()
            .that().areDeclaredInClassesThat().areAnnotatedWith(RestController.class)
            .and().areDeclaredInClassesThat().areNotAnnotatedWith(Hidden.class)
            .and().areMetaAnnotatedWith(RequestMapping.class)
            .should(declareAnOperationId())
            .allowEmptyShould(true);

    private static ArchCondition<JavaMethod> declareAnOperationId() {
        return new ArchCondition<>("declare @Operation(operationId = ...)") {
            @Override
            public void check(JavaMethod method, ConditionEvents events) {
                boolean declared = method.tryGetAnnotationOfType(Operation.class)
                        .map(operation -> !operation.operationId().isBlank())
                        .orElse(false);
                if (!declared) {
                    events.add(SimpleConditionEvent.violated(method, method.getFullName() + " has no @Operation(operationId)"));
                }
            }
        };
    }

    private static String[] featurePackages() {
        return FEATURES.stream().map(f -> ROOT + "." + f + "..").toArray(String[]::new);
    }

    private static String[] knownPackages() {
        return Stream.concat(
                Stream.of(ROOT, ROOT + ".shared.."),
                FEATURES.stream().map(f -> ROOT + "." + f + ".."))
                .toArray(String[]::new);
    }
}
