// Generated from contracts/out/ZalaryPayrollVault.sol. Do not edit by hand.
export const vaultAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "usdc",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "adminDelay",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "feeRecipient_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeBps_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FINANCE_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "HR_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_CLAIM_BATCH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_EMPLOYEES_PER_PAYROLL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PAUSER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "RELAYER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "USDC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptDefaultAdminTransfer",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allocations",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "claimed",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "refunded",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "beginDefaultAdminTransfer",
    "inputs": [
      {
        "name": "newAdmin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "calculateFee",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalWithFee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelDefaultAdminTransfer",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelPayrollDraft",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "changeDefaultAdminDelay",
    "inputs": [
      {
        "name": "newDelay",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimPayrollSalary",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimSalary",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimSalaryFor",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimableBalance",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createPayrollDraft",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "employees",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "amounts",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "totalAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "defaultAdmin",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "defaultAdminDelay",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "defaultAdminDelayIncreaseWait",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fundPayroll",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundPayrollDirect",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "employees",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "amounts",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "totalAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAllocation",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ZalaryPayrollVault.Allocation",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "claimed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "refunded",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimableBalance",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOpenPayrollIds",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPayroll",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ZalaryPayrollVault.PayrollMeta",
        "components": [
          {
            "name": "employer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "createdByHR",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "fundedByFinance",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "employeeCount",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "totalFunded",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "remainingEscrow",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "protocolFeePaid",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ZalaryPayrollVault.PayrollStatus"
          },
          {
            "name": "exists",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPayrollEmployees",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPayrollIds",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMembers",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "members",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isRoleMember",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openPayrollCount",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payrollCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "payrolls",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "employer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "createdByHR",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "fundedByFinance",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "employeeCount",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "totalFunded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "remainingEscrow",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "protocolFeePaid",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum ZalaryPayrollVault.PayrollStatus"
      },
      {
        "name": "exists",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingDefaultAdmin",
    "inputs": [],
    "outputs": [
      {
        "name": "newAdmin",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "schedule",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingDefaultAdminDelay",
    "inputs": [],
    "outputs": [
      {
        "name": "newDelay",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "schedule",
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refundLeftover",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requireSeparateApprover",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rescueToken",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "roleMemberCount",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rollbackDefaultAdminDelay",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setProtocolFee",
    "inputs": [
      {
        "name": "newFeeBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newFeeRecipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setRequireSeparateApprover",
    "inputs": [
      {
        "name": "required",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalClaimed",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalEscrowed",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalProtocolFeesCollected",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DefaultAdminDelayChangeCanceled",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DefaultAdminDelayChangeScheduled",
    "inputs": [
      {
        "name": "newDelay",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      },
      {
        "name": "effectSchedule",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DefaultAdminTransferCanceled",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DefaultAdminTransferScheduled",
    "inputs": [
      {
        "name": "newAdmin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "acceptSchedule",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EmergencyRescue",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LeftoverRefunded",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "employer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayrollDraftCancelled",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayrollDraftCreated",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "createdByHR",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "totalAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "employeeCount",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayrollFunded",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "employer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "total",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "employeeCount",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayrollSalaryClaimed",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "claimer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProtocolFeeCollected",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "feeRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProtocolFeeUpdated",
    "inputs": [
      {
        "name": "newFeeBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newFeeRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SalaryClaimed",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "claimer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SeparateApproverUpdated",
    "inputs": [
      {
        "name": "required",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlEnforcedDefaultAdminDelay",
    "inputs": [
      {
        "name": "schedule",
        "type": "uint48",
        "internalType": "uint48"
      }
    ]
  },
  {
    "type": "error",
    "name": "AccessControlEnforcedDefaultAdminRules",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlInvalidDefaultAdmin",
    "inputs": [
      {
        "name": "defaultAdmin",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "AllocationNotFound",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AlreadyRefunded",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "DuplicateEmployee",
    "inputs": [
      {
        "name": "employee",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptyEmployees",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FeeTooHigh",
    "inputs": [
      {
        "name": "supplied",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maximum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidDeadline",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPayrollId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPayrollStatus",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "current",
        "type": "uint8",
        "internalType": "enum ZalaryPayrollVault.PayrollStatus"
      }
    ]
  },
  {
    "type": "error",
    "name": "LengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoClaimableBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotEmployeeOrRelayer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotFinance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotHR",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotHRorFinance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PayrollAlreadyExists",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "PayrollNotExpired",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "PayrollNotFound",
    "inputs": [
      {
        "name": "payrollId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RescueExceedsSurplus",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "surplus",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SelfApprovalNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyEmployees",
    "inputs": [
      {
        "name": "supplied",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maximum",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "TotalAmountMismatch",
    "inputs": [
      {
        "name": "supplied",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "computed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const
