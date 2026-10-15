package pl.mpospieszynski.site.services.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.AdminFaq;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.AdminService;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.FaqInput;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.ServiceInput;
import pl.mpospieszynski.site.services.domain.ServicesAdminService;

/** Admin services and FAQ (docs/screens/admin/08-services-faq.md). */
@RestController
class AdminServicesController {

    record ServiceOrderRequest(List<UUID> ids) {
    }

    record FaqOrderRequest(List<UUID> ids) {
    }

    record ServiceActiveRequest(boolean active, long version) {
    }

    private final ServicesAdminService admin;

    AdminServicesController(ServicesAdminService admin) {
        this.admin = admin;
    }

    @Operation(operationId = "listAdminServices")
    @GetMapping("/api/v1/admin/services")
    List<AdminService> services() {
        return admin.listServices();
    }

    @Operation(operationId = "createAdminService")
    @PostMapping("/api/v1/admin/services")
    @ResponseStatus(HttpStatus.CREATED)
    AdminService createService(@RequestBody ServiceInput input) {
        return admin.createService(input);
    }

    @Operation(operationId = "saveAdminService")
    @PutMapping("/api/v1/admin/services/{id}")
    AdminService saveService(@PathVariable UUID id, @RequestBody ServiceInput input) {
        return admin.saveService(id, input);
    }

    @Operation(operationId = "setAdminServiceActive")
    @PatchMapping("/api/v1/admin/services/{id}")
    AdminService setActive(@PathVariable UUID id, @RequestBody ServiceActiveRequest request) {
        return admin.setActive(id, request.version(), request.active());
    }

    @Operation(operationId = "deleteAdminService", summary = "409 while messages refer to it")
    @DeleteMapping("/api/v1/admin/services/{id}")
    ResponseEntity<Void> deleteService(@PathVariable UUID id) {
        admin.deleteService(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "reorderAdminServices")
    @PutMapping("/api/v1/admin/services/order")
    ResponseEntity<Void> reorderServices(@RequestBody ServiceOrderRequest request) {
        admin.reorderServices(request.ids() == null ? List.of() : request.ids());
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "listAdminFaq")
    @GetMapping("/api/v1/admin/faq")
    List<AdminFaq> faq() {
        return admin.listFaq();
    }

    @Operation(operationId = "createAdminFaq")
    @PostMapping("/api/v1/admin/faq")
    @ResponseStatus(HttpStatus.CREATED)
    AdminFaq createFaq(@RequestBody FaqInput input) {
        return admin.createFaq(input);
    }

    @Operation(operationId = "saveAdminFaq")
    @PutMapping("/api/v1/admin/faq/{id}")
    AdminFaq saveFaq(@PathVariable UUID id, @RequestBody FaqInput input) {
        return admin.saveFaq(id, input);
    }

    @Operation(operationId = "deleteAdminFaq")
    @DeleteMapping("/api/v1/admin/faq/{id}")
    ResponseEntity<Void> deleteFaq(@PathVariable UUID id) {
        admin.deleteFaq(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "reorderAdminFaq")
    @PutMapping("/api/v1/admin/faq/order")
    ResponseEntity<Void> reorderFaq(@RequestBody FaqOrderRequest request) {
        admin.reorderFaq(request.ids() == null ? List.of() : request.ids());
        return ResponseEntity.noContent().build();
    }
}
