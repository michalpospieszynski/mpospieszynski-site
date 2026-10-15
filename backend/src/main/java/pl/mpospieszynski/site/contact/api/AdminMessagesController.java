package pl.mpospieszynski.site.contact.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.contact.domain.MessagesAdminService;
import pl.mpospieszynski.site.contact.domain.MessagesAdminService.MessageDetail;
import pl.mpospieszynski.site.contact.domain.MessagesAdminService.MessagePage;

/** Admin inbox (docs/screens/admin/04-messages.md). */
@RestController
@RequestMapping("/api/v1/admin/messages")
class AdminMessagesController {

    record MessageStatusRequest(
            @Schema(allowableValues = {"NEW", "READ", "REPLIED", "ARCHIVED", "SPAM"}) String status) {
    }

    private final MessagesAdminService messages;

    AdminMessagesController(MessagesAdminService messages) {
        this.messages = messages;
    }

    @Operation(operationId = "listAdminMessages", summary = "Newest first, with counts per status for the tabs")
    @GetMapping
    MessagePage list(@RequestParam(required = false) String status, @RequestParam(defaultValue = "") String q,
                     @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return messages.page(status, q, page, size);
    }

    @Operation(operationId = "getAdminMessage", summary = "Full message; a NEW message becomes READ")
    @GetMapping("/{id}")
    MessageDetail get(@PathVariable UUID id) {
        return messages.open(id);
    }

    @Operation(operationId = "setAdminMessageStatus")
    @PatchMapping("/{id}")
    ResponseEntity<Void> status(@PathVariable UUID id, @RequestBody MessageStatusRequest request) {
        messages.setStatus(id, request.status());
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "deleteAdminMessage")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        messages.delete(id);
        return ResponseEntity.noContent().build();
    }
}
