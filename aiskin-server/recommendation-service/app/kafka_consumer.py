import asyncio
import json
import logging
from aiokafka import AIOKafkaConsumer, TopicPartition
import os

logger = logging.getLogger(__name__)

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
TOPIC = "product-sync-topic"

class ProductKafkaConsumer:
    def __init__(self, engine, initial_products=None):
        self.engine = engine
        self.consumer = None
        self.products = {
            product.get('id', product.get('_id')): product
            for product in (initial_products or [])
            if product.get('id', product.get('_id'))
        }
        self.is_running = False
        
    async def start(self):
        self.consumer = AIOKafkaConsumer(
            TOPIC,
            bootstrap_servers=KAFKA_BROKER,
            group_id="recommendation-service-group",
            auto_offset_reset="earliest",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None
        )
        await self.consumer.start()
        self.is_running = True
        logger.info(f"Da ket noi Kafka Consumer toi {KAFKA_BROKER}, topic: {TOPIC}")
        
        # Start listening in background
        asyncio.create_task(self._consume_loop())
        
    async def _consume_loop(self):
        try:
            # We batch updates to avoid recalculating TF-IDF for every single product during initial sync
            batch = []
            async for msg in self.consumer:
                if not self.is_running:
                    break
                    
                product_data = msg.value
                if product_data:
                    p_id = product_data.get('id', product_data.get('_id'))
                    if p_id:
                        self.products[p_id] = product_data
                        batch.append(product_data)
                        
                # Update engine if we have enough or if we're just syncing
                tp = TopicPartition(msg.topic, msg.partition)
                highwater = self.consumer.highwater(tp)
                
                if len(batch) >= 50 or (len(batch) > 0 and highwater is not None and highwater - msg.offset <= 1):
                    logger.info(f"Dang dong bo {len(self.products)} san pham vao RecommendationEngine...")
                    self.engine.update_data(list(self.products.values()))
                    batch = []
                    
        except Exception as e:
            logger.error(f"Loi Consumer Kafka: {e}")
        finally:
            if self.consumer:
                await self.consumer.stop()
                
    async def stop(self):
        self.is_running = False
        if self.consumer:
            await self.consumer.stop()
            logger.info("Da dung Kafka Consumer.")
