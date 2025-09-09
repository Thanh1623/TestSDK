import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "./dist";
import { NFTInfo } from "./web3/contract.info";
import Cookies from 'js-cookie'
// import { accessToken, sessionToken } from "./const";
import axios from "axios";
import { ethers, parseUnits, ZeroAddress } from "ethers";

function App() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOTP] = useState("");
  const [log, setLog] = useState<any>();
  // const [OTPCount, setOTPCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [delistId, setDelistId] = useState<string>(""); // lưu ở dạng string để dễ nhập liệu

  const {
    loginMagic,
    verifyOTPMagic,
    // setIsSendingOTP,
    isVerifyingOTP,
    checkLoggedInMagic,
    disconnectWallet,
    ethersSigner,
    nftContract,
    magic,
    listNFT,
    history,
    marketContract
  } = useWeb3();

  console.log({ magic });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Đang đăng nhập với:", { email });

    await loginMagic?.({
      email: email,
      onSuccess: () => {
        setStep("otp");
      },
      onFail: () => { },
      onOTPSent: () => setStep("otp"),
      onVerifyOTPFail: () => {
        setOTP("");
        setError("Invalid OTP");
      },
      onLocked: () => {
        console.log("Locked");
        setStep("email");
        setOTP("");
        setError("Locked: Too many attempts");
      },
      onExpiredEmailOTP: () => {
        setError("OTP Expired");
      },
      onLoginThrottled: () => {
        setError("Login Throttled");
      },
      onDone: () => {
        setError(null);
        console.log("Đăng nhập thanh cong", step);
      },
      onError: (reason) => {
        setError("Login Failed");
        console.log(">>>>>> reason", reason);
        console.log(">>>>>> reason.code", reason?.code);
        console.log(">>>>>> reason.message", reason?.message);
        {
          /****
          >>>>>> reason r5: Magic RPC Error: [-32602] Invalid params: Please provide a valid email address. Dia chi email khong hop le
          >>>>>> reason r5: Magic RPC Error: [-32603] Internal server error : Loi nay se roi vao cac truong hop: nhap sai otp 3 lan lien tiep, khong co mang khi login
           */
        }
        if (reason?.code === -32603) {
          setStep("email");
        }
      },
    });
  };

  const handleLogout = useCallback(
    async (e: React.FormEvent) => {
      console.log({ disconnectWallet });
      e.preventDefault();
      await disconnectWallet();
    },
    [disconnectWallet]
  );

  async function mintNFT() {
    if (ethersSigner && nftContract) {
      // Gọi hàm mint (chỉ cần address)

      try {
        const address = await ethersSigner.getAddress();
        console.log("get Address:", address);

        // ⚠️ ở đây phải đúng tên function trong ABI, có thể là "mint", "safeMint", "mintTo", v.v.
        const tx = await nftContract.mint(address);
        console.log("Minting... tx hash:", tx.hash);

        const receipt = await tx.wait();
        setLog(receipt);
        console.log("Mint thành công:", receipt);
        console.log("NFT tokenId:", receipt.logs[0].topics[3]);
      } catch (e) {
        console.log({ e });
      }
    }
  }
  console.log({ log });

  const onList = useCallback(async () => {
    // Hàm rút gọn chuỗi dài
    const shorten = (val?: string, visible = 10) => {
      if (!val) return val;
      if (val.startsWith("0x") && val.length > visible + 2) {
        return `${val.slice(0, 8)}...${val.slice(-4)}`; // ví dụ địa chỉ/hash
      }
      if (val.length > visible * 2) {
        return `${val.slice(0, visible)}...`;
      }
      return val;
    };

    try {
      console.log({ log });

      if (log) {
        const tokenId = BigInt(log.logs[0].topics[3]).toString();
        // const tokenId = '0x0000000000000000000000000000000000000000000000000000000000000046'
        console.log(tokenId)
        const data = await listNFT({
          price: "0.1",
          amount: 1,
          tokenId,
        });
        console.log({ data });
      }
    } catch (error: any) {
      // Lấy những trường chính và rút gọn chuỗi dài
      const errObj = {
        name: error?.name,
        code: error?.code,
        message: shorten(error?.message, 60),
        reason: error?.reason,
        args: error?.revert?.args?.map((a: string) => shorten(a)) || [],
        signature: error?.revert?.signature,
        data: shorten(error?.data, 20),           // <-- chỉ hiện đầu 20 ký tự
        transaction: {
          from: shorten(error?.transaction?.from),
          to: shorten(error?.transaction?.to),
          hash: shorten(error?.transaction?.hash),
        },
      };

      console.error("❌ Error:", errObj);
    }
  }, [listNFT, log]);


  useEffect(() => {
    if (step !== "otp") return;

    if (otp.length === 6) {
      verifyOTPMagic?.(otp, () => { });
    }
  }, [otp, step]);

  // const setCookie = () => {
  //   Cookies.set("access_token", accessToken);
  //   Cookies.set("session", sessionToken);
  // };

  // const onCheckAuthorize = async () => {
  //   try {
  //     const res = await axios.put(
  //       "/api/authorize",
  //       {},
  //       { withCredentials: true }
  //     );
  //     console.log(res.data);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // };

  const handleListToken = async () => {
    try {
      if (!ethersSigner || !marketContract) {
        console.error("❌ Signer hoặc Contract chưa được khởi tạo.");
        return;
      }
      const listings = await marketContract.viewAllListings()
      listings.forEach((l: any, i: any) => {
        console.log(`#${i}`, {
          contractAddress: l.contractAddress,
          tokenSell: l.tokenSell,
          seller: l.seller,
          buyer: l.buyer, // address[]
          tokenId: l.tokenId.toString(),
          amount: l.amount.toString(),
          priceEth: ethers.formatUnits(l.price, 18), // "0.1"
          tokensAvailable: l.tokensAvailable.toString(),
          privateListing: l.privateListing,
          completed: l.completed,
          listingId: l.listingId.toString(),
        });
      });
    } catch (err) {
      console.log(err)
    }
  }

  const handleDelistToken = async () => {
    const shorten = (x: any, n = 10) => {
      if (x == null) return x;
      const s = String(x);
      if (s.startsWith("0x") && s.length > n + 2) return `${s.slice(0, 8)}...${s.slice(-4)}`;
      if (s.length > n * 2) return `${s.slice(0, n)}...`;
      return s;
    };
    const formatErr = (e: any) => ({
      name: e?.name || "UnknownError",
      code: e?.code || "NO_CODE",
      message: shorten(e?.message, 200) || "No message",
      reason: e?.reason || "No reason",
      data: shorten(e?.data, 20) || "No data",
    });

    if (!marketContract || !ethersSigner) {
      console.error("❌ Market contract hoặc signer chưa init");
      return;
    }

    try {
      // 1) listingId chuẩn bigint (chỉ decimal/hex number, KHÔNG phải string "0x..." bytes)
      const toBigInt = (v: any) => (typeof v === "bigint" ? v : BigInt(String(v)));
      const listingId = toBigInt(delistId);

      const provider = ethersSigner.provider!;
      const from = await ethersSigner.getAddress();

      // 2) Ước lượng gas CHO MỘT LISTING HỢP LỆ (điều kiện require phải pass)
      const gasLimit = await marketContract.deleteListing.estimateGas(listingId);

      // 3) Lấy balance hiện tại
      const balance = await provider.getBalance(from);

      // 4) TÍNH gasPrice (legacy) hoặc maxFeePerGas (EIP-1559) vừa đủ để VƯỢT balance
      //    Quy tắc: node sẽ kiểm tra "gasLimit * gasPrice + value" (value=0 ở đây).
      //    Ta chọn price = floor(balance / gasLimit) + 1 để chắc chắn thiếu.
      const mustFailPrice = balance / gasLimit + 1n;

      // 5) Lấy feeData để biết mạng có EIP-1559 hay không
      const feeData = await provider.getFeeData();
      let overrides: any;

      if (feeData.maxFeePerGas != null) {
        // EIP-1559: đặt maxFeePerGas cao hơn balance/gasLimit để bị từ chối
        const maxFeePerGas = mustFailPrice;
        // priority phải <= maxFeePerGas
        const maxPriorityFeePerGas = maxFeePerGas > 1_000_000_000n ? 1_000_000_000n : maxFeePerGas; // ≤1 gwei hoặc ≤maxFee
        overrides = { gasLimit, maxFeePerGas, maxPriorityFeePerGas };
      } else {
        // Legacy: đặt gasPrice cao hơn balance/gasLimit
        overrides = { gasLimit, gasPrice: mustFailPrice };
      }

      console.log("🚀 Sending with forced-high fee to trigger insufficient funds", {
        gasLimit: gasLimit.toString(),
        priceWei: (overrides.gasPrice ?? overrides.maxFeePerGas).toString(),
        balanceWei: balance.toString(),
      });

      // 6) Gửi tx → kỳ vọng provider ném lỗi "insufficient funds ..."
      const tx = await marketContract.deleteListing(listingId, overrides);
      // Nếu tới đây mà KHÔNG lỗi (tức bạn vẫn đủ tiền 😅), có thể cancel/không wait.
      console.log("⚠️ Tx unexpectedly sent:", tx.hash);
    } catch (error: any) {
      // Đây là lỗi "thật" do provider/chain trả về (không giả lập)
      console.error("❌ RPC error:", formatErr(error));
      // Bạn sẽ thấy dạng:
      //  - code: "INSUFFICIENT_FUNDS" hoặc "UNPREDICTABLE_GAS_LIMIT" (nếu require fail)
      //  - message: "insufficient funds for intrinsic transaction cost"
    }
  };


  // Demo gọi setApprovalForAll: cho phép marketplace toàn quyền quản lý NFT của bạn
const handleApproveMarketplace = async () => {
  try {
    if (!nftContract || !ethersSigner || !marketContract) {
      console.error("❌ Contract hoặc signer chưa init");
      return;
    }

    const user = await ethersSigner.getAddress();
    const marketAddr = await marketContract.getAddress();
    console.log(`🔑 Approving marketplace ${marketAddr} for ${user}`);

    // 🔍 Kiểm tra operator có phải chính owner không
    if (marketAddr.toLowerCase() === user.toLowerCase()) {
      console.error("❌ Lỗi: operator không thể là chính owner (ERC721: approve to caller)");
      return;
    }

    // Gọi hàm setApprovalForAll
    const tx = await nftContract.setApprovalForAll('sdfsadfsa', true);
    console.log("🟡 Tx sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Approved:", {
      txHash: receipt.hash,
      status: receipt.status,
      block: receipt.blockNumber,
    });
  } catch (err: any) {
    console.error("❌ Approve failed:", err);
  }
};



  return (
    <>
      <div>
        <form onSubmit={handleLogout}>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
          >
            Logout
          </button>
        </form>
        <button
          onClick={async () => {
            const rs = await checkLoggedInMagic();
            console.log({ rs });
          }}
        >
          Check
        </button>

        <button
          onClick={() => {
            setStep("otp");
          }}
        >
          next step
        </button>

        <button onClick={mintNFT}>Mint</button>
        <button onClick={() => console.log(magic?.wallet?.showAddress())}>
          Address
        </button>
        <button onClick={() => console.log(magic?.user?.getIdToken())}>
          xx
        </button>
        <button onClick={() => console.log(magic?.wallet?.showBalances())}>
          pp
        </button>
        <button onClick={onList}>List</button>
        <button
          onClick={async () => {
            const xxx = await history();
            console.log({ xxx });
          }}
        >
          history
        </button>
        {/* <button 
          onClick={}  
        >
          Check
        </button> */}
        {/* <button onClick={setCookie}>set Cookie</button>

        <button onClick={onCheckAuthorize}>call api author</button> */}
        <button onClick={handleListToken}>List all token</button>
        <div style={{ border: '1px solid black', width: 'fit-content', padding: '2px' }}>
          <input onChange={e => setDelistId(e.target.value)}></input>
          <button onClick={handleDelistToken}>Delist token</button>
        </div>
        <button onClick={handleApproveMarketplace}>
          Approve Marketplace
        </button>

      </div>
      {step === "email" ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-center">Đăng nhập</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
            >
              Đăng nhập
            </button>
          </form>
        </div>
      ) : (
        <div>
          <form
            onSubmit={handleLogout}
            className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-center">OTP</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                INPUT OTP
                {isVerifyingOTP && <div>Loading</div>}
              </label>
              <input
                value={otp}
                onChange={(e) => setOTP(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {error && <p className="text-red-500">{error}</p>}
          </form>
        </div>
      )}
    </>
  );
}

export default App;
