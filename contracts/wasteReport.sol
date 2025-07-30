// contracts/WasteReport.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract WasteReport {
    struct Report {
        uint256 id;
        address farmer;
        string wasteType;
        uint256 quantity;
        uint256 timestamp;
        string location;
        bool processed;
        string phoneNumber; // For USSD integration
    }
    
    mapping(uint256 => Report) public reports;
    mapping(address => uint256[]) public farmerReports;
    uint256 public reportCount;
    
    event ReportCreated(uint256 id, address farmer, string wasteType, uint256 quantity);
    
    function createReport(
        string memory wasteType, 
        uint256 quantity, 
        string memory location,
        string memory phoneNumber
    ) public {
        reportCount++;
        reports[reportCount] = Report({
            id: reportCount,
            farmer: msg.sender,
            wasteType: wasteType,
            quantity: quantity,
            timestamp: block.timestamp,
            location: location,
            processed: false,
            phoneNumber: phoneNumber
        });
        
        farmerReports[msg.sender].push(reportCount);
        emit ReportCreated(reportCount, msg.sender, wasteType, quantity);
    }
    
    function getFarmerReports(address farmer) public view returns (uint256[] memory) {
        return farmerReports[farmer];
    }
}