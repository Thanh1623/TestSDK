import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "./dist";
import { NFTInfo } from "./web3/contract.info";
import Cookies from "js-cookie";
import { accessToken, sessionToken } from "./const";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOTP] = useState("");
  const [log, setLog] = useState<any>();
  // const [OTPCount, setOTPCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      onFail: () => {},
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
      } catch (e) {
        console.log({ e });
      }
    }
  }
  console.log({ log });
  const onList = useCallback(async () => {
    console.log({ log });
    // const data =
    if (log) {
      const data = await listNFT({
        price: "0.1",
        amount: 1,
        tokenId: log.logs[0].topics[3],
      });
      console.log({ data });
    }
  }, [listNFT, log]);

  useEffect(() => {
    if (step !== "otp") return;

    if (otp.length === 6) {
      verifyOTPMagic?.(otp, () => {});
    }
  }, [otp, step]);

  const setCookie = () => {
    Cookies.set("access_token", accessToken);
    Cookies.set("session", sessionToken);
  };

  const onCheckAuthorize = async () => {
    try {
      const res = await axios.put(
        "/api/authorize",
        {},
        { withCredentials: true }
      );
      console.log(res.data);
    } catch (e) {
      console.log(e);
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
        <button onClick={setCookie}>set Cookie</button>

        <button onClick={onCheckAuthorize}>call api author</button>
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
