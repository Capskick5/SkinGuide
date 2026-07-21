package mss.userservice.service.impl;

import mss.userservice.model.Favorite;
import mss.userservice.repository.FavoriteRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FavoriteServiceTest {

    private final FavoriteRepository repository = mock(FavoriteRepository.class);
    private final FavoriteService service = new FavoriteService(repository);

    @Test
    void listReturnsProductIdsInStoredOrder() {
        when(repository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of(
                Favorite.builder().userId("u1").productId("p-2").build(),
                Favorite.builder().userId("u1").productId("p-1").build()));

        assertThat(service.list("u1")).containsExactly("p-2", "p-1");
    }

    @Test
    void addIsIdempotentWhenAlreadyPresent() {
        when(repository.existsByUserIdAndProductId("u1", "p-1")).thenReturn(true);
        when(repository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of(
                Favorite.builder().userId("u1").productId("p-1").build()));

        service.add("u1", "p-1");

        verify(repository, never()).save(any());
    }

    @Test
    void addSavesWhenAbsent() {
        when(repository.existsByUserIdAndProductId("u1", "p-9")).thenReturn(false);
        when(repository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of());

        service.add("u1", "p-9");

        verify(repository, times(1)).save(any(Favorite.class));
    }

    @Test
    void mergeSkipsBlankAndExistingIds() {
        when(repository.existsByUserIdAndProductId("u1", "p-1")).thenReturn(true);
        when(repository.existsByUserIdAndProductId("u1", "p-2")).thenReturn(false);
        when(repository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of());

        service.merge("u1", java.util.Arrays.asList("p-1", "p-2", "", null));

        // p-1 đã có -> bỏ; "" và null -> bỏ; chỉ p-2 được lưu.
        verify(repository, times(1)).save(any(Favorite.class));
    }
}
