// contracts/ProcessingBatch.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProcessingBatch {
    struct Batch {
        uint256 id;
        string batchNumber;
        uint256[] wasteReportIds;
        string qrCode;
        uint256 inputWeight;
        uint256 outputWeight;
        uint256 timestamp;
        bool completed;
        address[] contributingFarmers;
    }
    
    mapping(uint256 => Batch) public batches;
    uint256 public batchCount;
    
    event BatchCreated(uint256 id, string batchNumber, string qrCode);
    event BatchCompleted(uint256 id, uint256 outputWeight);
    
    function createBatch(
        string memory batchNumber, 
        uint256[] memory wasteReportIds, 
        string memory qrCode,
        address[] memory farmers
    ) public {
        batchCount++;
        batches[batchCount] = Batch({
            id: batchCount,
            batchNumber: batchNumber,
            wasteReportIds: wasteReportIds,
            qrCode: qrCode,
            inputWeight: 0,
            outputWeight: 0,
            timestamp: block.timestamp,
            completed: false,
            contributingFarmers: farmers
        });
        
        emit BatchCreated(batchCount, batchNumber, qrCode);
    }
    
    function completeBatch(uint256 batchId, uint256 outputWeight) public {
        require(batches[batchId].id != 0, "Batch does not exist");
        batches[batchId].outputWeight = outputWeight;
        batches[batchId].completed = true;
        
        emit BatchCompleted(batchId, outputWeight);
    }
}