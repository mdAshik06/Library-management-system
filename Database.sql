-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bookstore
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES (1,1,'Category added','\"Academic Book\"','2026-07-22 10:44:43'),(2,1,'Book updated','\"The Hidden Language of Computer Hardware and Software\"','2026-07-22 10:45:14'),(3,1,'User blocked','User ID: 3','2026-07-22 10:46:18'),(4,1,'User unblocked','User ID: 3','2026-07-22 10:46:27'),(5,1,'Book added','\"The Law of Human Nature\"','2026-07-26 04:51:37'),(6,1,'Order status updated','Order #8 → delivered','2026-07-26 04:52:56'),(7,1,'Payment status updated','Order #8 → paid','2026-07-26 04:52:58'),(8,1,'Made user admin','User ID: 3','2026-08-04 05:44:26'),(9,1,'Removed admin access','User ID: 3','2026-08-04 05:44:30'),(10,1,'Made user admin','User ID: 4','2026-08-04 05:45:44'),(11,4,'Removed admin access','User ID: 1','2026-08-04 05:46:12'),(12,4,'Made user admin','User ID: 1','2026-08-04 05:46:21'),(13,1,'Removed admin access','User ID: 4','2026-08-04 05:47:16'),(14,1,'Order status updated','Order #6 → pending','2026-08-04 07:50:16'),(15,1,'Order status updated','Order #6 → delivered','2026-08-04 07:50:24');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `author` varchar(150) NOT NULL,
  `category_id` int DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `description` text,
  `cover_image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_featured` tinyint(1) DEFAULT '0',
  `pdf_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `books`
--

LOCK TABLES `books` WRITE;
/*!40000 ALTER TABLE `books` DISABLE KEYS */;
INSERT INTO `books` VALUES (1,'Little Women','Louisa May Alcott',1,450.00,29,'Louisa May Alcott\'s classic tale of four sisters in a deluxe hardcover edition, with beautiful cover illustrations by Anna Bond, the artist behind world-renowned stationery brand Rifle Paper Co.','/uploads/covers/book-1784528332980-866286851.jpg','2026-07-20 06:18:52',0,NULL),(2,'Pride and Prejudice','Jane Austen',1,520.00,29,'Austen\'s most popular novel, the unforgettable story of Elizabeth Bennet and Mr. Darcy','/uploads/covers/book-1784528527704-51439734.jpg','2026-07-20 06:22:07',0,NULL),(3,'Hamlet','William Shakespeare',3,500.00,14,'Among Shakespeare\'s plays, \"Hamlet\" is considered by many his masterpiece. Among actors, the role of Hamlet, Prince of Denmark, is considered the jewel in the crown of a triumphant theatrical career. Now Kenneth Branagh plays the leading role and co-directs a brillant ensemble performance.','/uploads/covers/book-1784539120975-733822352.jpg','2026-07-20 06:25:45',0,NULL),(4,'Romeo and Juliet','William Shakespeare',3,600.00,2,'The people who dislike this play are the ones who view common sense over being rational, and prefer to view the world in a structured way.','/uploads/covers/book-1784539255847-464384147.jpg','2026-07-20 06:26:54',1,NULL),(5,'The Hidden Language of Computer Hardware and Software','Charles Petzold',4,250.00,99,'For me, Code was a revelation. It was the first book about programming that spoke to me. It started with a story, and it built up, layer by layer, analogy by analogy','/uploads/covers/book-1784540267840-429017695.jpg','2026-07-20 09:37:47',1,NULL),(6,'Python Crash Course, A Hands-On, Project-Based Introduction to Programming','Eric Matthes',4,720.00,24,'Python Crash Course by Eric Matthes is an excellent book for beginners who are looking to learn Python programming. The book covers everything from the basics of Python programming to more advanced topics like web development and data analysis. Here is a detailed review of the book','/uploads/covers/book-1784540383663-87223655.jpg','2026-07-20 09:39:43',1,NULL),(7,'The Law of Human Nature','Robert Greene',5,720.00,24,'The definitive guide to understanding human behavior is The Laws of Human Nature by Robert Greene. Spanning 624 pages, this comprehensive bestseller explores the 18 fundamental psychological drives and motives that influence how people act and react, providing strategies to master your own emotions, develop empathy, and successfully navigate interpersonal dynamics','/uploads/covers/book-1785041497798-884245701.jpg','2026-07-26 04:51:37',1,'bookpdf-1785041497798-184576307.pdf');
/*!40000 ALTER TABLE `books` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `book_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (18,2,7,1,'2026-08-04 06:36:06');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (5,'Academic Book'),(3,'Drama'),(1,'Fiction'),(4,'Programming');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `discount_percent` decimal(5,2) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES (1,'RAFI10',10.00,'2026-07-23',1,'2026-07-22 04:30:34');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `book_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,6,1,720.00),(2,2,3,2,500.00),(3,3,3,3,500.00),(4,4,4,1,600.00),(5,5,5,1,250.00),(6,6,1,1,450.00),(7,6,2,1,520.00),(8,7,3,1,500.00),(9,8,7,1,720.00);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `payment_status` enum('pending','paid','failed') DEFAULT 'pending',
  `order_status` enum('pending','accepted','shipped','delivered','cancelled') DEFAULT 'pending',
  `shipping_address` varchar(255) DEFAULT NULL,
  `contact_mobile` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `coupon_code` varchar(50) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,2,720.00,'bKash','111111111a','paid','delivered','Abcd, asd9, dsmfh','01320859633','2026-07-20 10:27:03',NULL,0.00),(2,2,1000.00,'Nagad','111111111b','paid','delivered','asdf','01320859633','2026-07-20 10:30:16',NULL,0.00),(3,2,1500.00,'bKash','111111111a','paid','delivered','tybwerb','01320859633','2026-07-21 05:09:31',NULL,0.00),(4,2,600.00,'bKash','asdf','paid','delivered','sdfg','01320859633','2026-07-21 05:22:31',NULL,0.00),(5,2,250.00,'Cash on Delivery',NULL,'paid','delivered','gdsfg','01320859633','2026-07-21 08:37:15',NULL,0.00),(6,3,970.00,'Nagad','111111111b','paid','delivered','dvzxf','01320859633','2026-07-22 03:51:21',NULL,0.00),(7,3,450.00,'Cash on Delivery',NULL,'paid','delivered','asdf','01320859633','2026-07-22 04:32:30','RAFI10',50.00),(8,3,720.00,'Cash on Delivery',NULL,'paid','delivered','dfsgsda','01320859633','2026-07-26 04:52:26',NULL,0.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `book_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_book` (`user_id`,`book_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (2,2,6,5,'Cool','2026-07-21 11:18:13'),(3,3,6,4,'Good','2026-07-21 11:19:08'),(4,2,4,5,'This book is good','2026-07-21 11:40:29'),(5,2,7,5,'asdfasdf','2026-07-26 05:06:55');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT '0',
  `is_blocked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Rifat Ahmed','admin@gmail.com','$2a$10$589aknlvn/KANoy4Z2QnceqXKPujI1pjQt6gyytkWI5EjWTc0olFC','/uploads/profiles/profile-1784717967688-722945155.jpg','','',1,0,'2026-07-20 06:01:29'),(2,'User1','user1@gmail.com','$2a$10$FxSLm2RceRHn2MpgUrdzQOyhNrH/mZ5NeKtYeHhMttRnWXgzlrXiK','/uploads/profiles/profile-1784610174000-417726052.jpg','asdf','01310740834',0,0,'2026-07-20 09:40:55'),(3,'User2','user2@gmail.com','$2a$10$Rcr/QyoxXdBno/3jUt8zZe1fJwMqGiE2INLjqclhnWz42N.0iPQSK',NULL,NULL,NULL,0,0,'2026-07-21 11:18:44'),(4,'Rifat','admin1@gmail.com','$2a$10$kJUBVnvFEZL5sb6vALtOHOsBlIPbTBC.EGeJEeQfP0cP3o4B7YhzW',NULL,NULL,NULL,0,0,'2026-08-04 05:45:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist_items`
--

DROP TABLE IF EXISTS `wishlist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `book_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_wishlist_book` (`user_id`,`book_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `wishlist_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wishlist_items_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist_items`
--

LOCK TABLES `wishlist_items` WRITE;
/*!40000 ALTER TABLE `wishlist_items` DISABLE KEYS */;
INSERT INTO `wishlist_items` VALUES (7,3,6,'2026-07-21 11:48:01'),(8,3,4,'2026-07-21 11:48:02'),(9,3,1,'2026-07-21 11:48:04'),(10,3,5,'2026-07-21 11:48:12'),(11,3,2,'2026-07-22 03:50:56'),(12,1,1,'2026-07-22 11:04:04'),(15,2,4,'2026-07-22 11:16:10'),(16,2,6,'2026-07-22 11:16:11'),(17,2,3,'2026-07-22 11:16:16'),(19,3,7,'2026-07-26 04:52:02');
/*!40000 ALTER TABLE `wishlist_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 14:38:41
