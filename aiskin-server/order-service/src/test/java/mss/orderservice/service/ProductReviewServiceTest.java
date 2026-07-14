package mss.orderservice.service;

import mss.orderservice.dto.ProductReviewRequest;
import mss.orderservice.model.Order;
import mss.orderservice.model.OrderItem;
import mss.orderservice.model.ProductReview;
import mss.orderservice.repository.OrderRepository;
import mss.orderservice.repository.ProductReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductReviewServiceTest {

    private final ProductReviewRepository reviewRepository = mock(ProductReviewRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private ProductReviewService service;

    @BeforeEach
    void setUp() {
        service = new ProductReviewService(reviewRepository, orderRepository);
    }

    @Test
    void createsReviewOnlyFromDeliveredPurchase() {
        Order deliveredOrder = deliveredOrder("user-1", "product-1");
        when(reviewRepository.findByCustomerIdAndProductId("user-1", "product-1"))
                .thenReturn(Optional.empty());
        when(orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(
                eq("user-1"), eq(Order.OrderStatus.DELIVERED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(deliveredOrder)));
        when(reviewRepository.save(any(ProductReview.class))).thenAnswer(invocation -> {
            ProductReview review = invocation.getArgument(0);
            review.setId("review-1");
            return review;
        });

        var response = service.create("user-1", "product-1", request(5, "Phù hợp với da của tôi"));

        assertThat(response.getId()).isEqualTo("review-1");
        assertThat(response.getVerifiedPurchase()).isTrue();
        assertThat(response.getReviewerName()).isEqualTo("Nguyễn ***");
    }

    @Test
    void rejectsReviewWithoutDeliveredPurchase() {
        when(reviewRepository.findByCustomerIdAndProductId("user-1", "product-1"))
                .thenReturn(Optional.empty());
        when(orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(
                eq("user-1"), eq(Order.OrderStatus.DELIVERED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        assertThatThrownBy(() -> service.create("user-1", "product-1", request(4, "Sản phẩm ổn")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("đã nhận sản phẩm");
    }

    @Test
    void preventsCustomerFromEditingAnotherReview() {
        ProductReview review = ProductReview.builder().id("review-1").customerId("user-2").build();
        when(reviewRepository.findById("review-1")).thenReturn(Optional.of(review));

        assertThatThrownBy(() -> service.update("user-1", "review-1", request(1, "Không phù hợp")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không có quyền");
        verify(reviewRepository).findById("review-1");
    }

    private ProductReviewRequest request(int rating, String comment) {
        ProductReviewRequest request = new ProductReviewRequest();
        request.setRating(rating);
        request.setComment(comment);
        return request;
    }

    private Order deliveredOrder(String customerId, String productId) {
        return Order.builder()
                .id("order-1")
                .orderCode("ORD-1")
                .customerId(customerId)
                .customerName("Nguyễn Văn A")
                .status(Order.OrderStatus.DELIVERED)
                .items(List.of(OrderItem.builder().productId(productId).build()))
                .build();
    }
}
