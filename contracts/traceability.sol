// contracts/Traceability.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Traceability {
    struct Product {
        string qrCode;
        uint256 batchId;
        address[] contributingFarmers;
        string[] locations;
        uint256 timestamp;
        bool verified;
        string productType;
        uint256 quantity;
        uint256 pricePerKg;
        uint256 totalValue;
    }

    struct Transaction {
        uint256 id;
        address from;
        address to;
        uint256 amount;
        string transactionType; // "waste_purchase", "product_sale", "farmer_payment"
        uint256 timestamp;
        string description;
        bool completed;
    }

    struct SupplyChainEvent {
        uint256 id;
        string eventType; // "waste_reported", "waste_collected", "processing_started", "processing_completed", "product_created", "product_sold"
        string qrCode;
        address farmer;
        uint256 quantity;
        uint256 timestamp;
        string location;
        string metadata; // JSON string for additional data
    }

    mapping(string => Product) public products;
    mapping(uint256 => string[]) public batchProducts;
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => SupplyChainEvent) public supplyChainEvents;
    mapping(address => uint256[]) public farmerTransactions;
    mapping(address => uint256[]) public farmerEvents;

    uint256 public transactionCount;
    uint256 public eventCount;

    // Events for blockchain logging
    event ProductRegistered(
        string qrCode,
        uint256 batchId,
        string productType,
        uint256 quantity
    );
    event TransactionCreated(
        uint256 transactionId,
        address from,
        address to,
        uint256 amount,
        string transactionType
    );
    event SupplyChainEventLogged(
        uint256 eventId,
        string eventType,
        string qrCode,
        address farmer,
        uint256 quantity
    );
    event PaymentProcessed(
        uint256 transactionId,
        address farmer,
        uint256 amount,
        string paymentMethod
    );
    event WasteReported(
        address farmer,
        string wasteType,
        uint256 quantity,
        string location
    );
    event ProcessingStarted(
        string qrCode,
        uint256 batchId,
        uint256 inputWeight
    );
    event ProcessingCompleted(
        string qrCode,
        uint256 batchId,
        uint256 outputWeight
    );
    event ProductSold(
        string qrCode,
        address buyer,
        uint256 quantity,
        uint256 totalAmount
    );

    function registerProduct(
        string memory qrCode,
        uint256 batchId,
        address[] memory farmers,
        string[] memory locations,
        string memory productType,
        uint256 quantity,
        uint256 pricePerKg
    ) public {
        uint256 totalValue = quantity * pricePerKg;

        products[qrCode] = Product({
            qrCode: qrCode,
            batchId: batchId,
            contributingFarmers: farmers,
            locations: locations,
            timestamp: block.timestamp,
            verified: true,
            productType: productType,
            quantity: quantity,
            pricePerKg: pricePerKg,
            totalValue: totalValue
        });

        batchProducts[batchId].push(qrCode);

        // Log supply chain event
        logSupplyChainEvent(
            "product_created",
            qrCode,
            address(0),
            quantity,
            locations[0],
            string(
                abi.encodePacked("Batch: ", batchId, ", Type: ", productType)
            )
        );

        emit ProductRegistered(qrCode, batchId, productType, quantity);
    }

    function logWasteReport(
        address farmer,
        string memory wasteType,
        uint256 quantity,
        string memory location
    ) public {
        logSupplyChainEvent(
            "waste_reported",
            "",
            farmer,
            quantity,
            location,
            wasteType
        );
        emit WasteReported(farmer, wasteType, quantity, location);
    }

    function logWasteCollection(
        address farmer,
        string memory qrCode,
        uint256 quantity,
        string memory location
    ) public {
        logSupplyChainEvent(
            "waste_collected",
            qrCode,
            farmer,
            quantity,
            location,
            ""
        );
    }

    function logProcessingStarted(
        string memory qrCode,
        uint256 batchId,
        uint256 inputWeight
    ) public {
        logSupplyChainEvent(
            "processing_started",
            qrCode,
            address(0),
            inputWeight,
            "",
            string(abi.encodePacked("Batch: ", batchId))
        );
        emit ProcessingStarted(qrCode, batchId, inputWeight);
    }

    function logProcessingCompleted(
        string memory qrCode,
        uint256 batchId,
        uint256 outputWeight
    ) public {
        logSupplyChainEvent(
            "processing_completed",
            qrCode,
            address(0),
            outputWeight,
            "",
            string(abi.encodePacked("Batch: ", batchId))
        );
        emit ProcessingCompleted(qrCode, batchId, outputWeight);
    }

    function createTransaction(
        address from,
        address to,
        uint256 amount,
        string memory transactionType,
        string memory description
    ) public returns (uint256) {
        transactionCount++;

        transactions[transactionCount] = Transaction({
            id: transactionCount,
            from: from,
            to: to,
            amount: amount,
            transactionType: transactionType,
            timestamp: block.timestamp,
            description: description,
            completed: false
        });

        farmerTransactions[from].push(transactionCount);
        farmerTransactions[to].push(transactionCount);

        emit TransactionCreated(
            transactionCount,
            from,
            to,
            amount,
            transactionType
        );

        return transactionCount;
    }

    function processPayment(
        uint256 transactionId,
        address farmer,
        uint256 amount,
        string memory paymentMethod
    ) public {
        require(
            transactions[transactionId].id != 0,
            "Transaction does not exist"
        );
        require(
            !transactions[transactionId].completed,
            "Transaction already completed"
        );

        transactions[transactionId].completed = true;

        emit PaymentProcessed(transactionId, farmer, amount, paymentMethod);
    }

    function logProductSale(
        string memory qrCode,
        address buyer,
        uint256 quantity,
        uint256 totalAmount
    ) public {
        logSupplyChainEvent(
            "product_sold",
            qrCode,
            buyer,
            quantity,
            "",
            string(abi.encodePacked("Amount: ", totalAmount))
        );
        emit ProductSold(qrCode, buyer, quantity, totalAmount);
    }

    function logSupplyChainEvent(
        string memory eventType,
        string memory qrCode,
        address farmer,
        uint256 quantity,
        string memory location,
        string memory metadata
    ) internal {
        eventCount++;

        supplyChainEvents[eventCount] = SupplyChainEvent({
            id: eventCount,
            eventType: eventType,
            qrCode: qrCode,
            farmer: farmer,
            quantity: quantity,
            timestamp: block.timestamp,
            location: location,
            metadata: metadata
        });

        if (farmer != address(0)) {
            farmerEvents[farmer].push(eventCount);
        }

        emit SupplyChainEventLogged(
            eventCount,
            eventType,
            qrCode,
            farmer,
            quantity
        );
    }

    function verifyProduct(
        string memory qrCode
    ) public view returns (Product memory) {
        return products[qrCode];
    }

    function getFarmerTransactions(
        address farmer
    ) public view returns (uint256[] memory) {
        return farmerTransactions[farmer];
    }

    function getFarmerEvents(
        address farmer
    ) public view returns (uint256[] memory) {
        return farmerEvents[farmer];
    }

    function getTransaction(
        uint256 transactionId
    ) public view returns (Transaction memory) {
        return transactions[transactionId];
    }

    function getSupplyChainEvent(
        uint256 eventId
    ) public view returns (SupplyChainEvent memory) {
        return supplyChainEvents[eventId];
    }

    function getProductTraceability(
        string memory qrCode
    )
        public
        view
        returns (Product memory product, uint256[] memory relatedEvents)
    {
        product = products[qrCode];

        // Find all events related to this QR code
        uint256[] memory tempEvents = new uint256[](eventCount);
        uint256 count = 0;

        for (uint256 i = 1; i <= eventCount; i++) {
            if (
                keccak256(bytes(supplyChainEvents[i].qrCode)) ==
                keccak256(bytes(qrCode))
            ) {
                tempEvents[count] = i;
                count++;
            }
        }

        relatedEvents = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            relatedEvents[i] = tempEvents[i];
        }
    }
}
