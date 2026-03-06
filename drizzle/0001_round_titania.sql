CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `exchangeRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrency` varchar(3) NOT NULL,
	`toCurrency` varchar(3) NOT NULL,
	`rate` varchar(20) NOT NULL,
	`date` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchangeRates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`day` int NOT NULL,
	`month` varchar(50) NOT NULL,
	`year` int NOT NULL,
	`amountOriginal` varchar(20) NOT NULL,
	`currencyOriginal` varchar(3) NOT NULL,
	`amountEur` varchar(20) NOT NULL,
	`exchangeRate` varchar(20),
	`categoryId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncedToSheet` int NOT NULL DEFAULT 0,
	`sheetRowId` int,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
