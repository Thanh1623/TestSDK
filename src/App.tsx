import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "./dist";
import httpService from "./httpService";

function App() {
  const [email, setEmail] = useState("");
  const [emailPOST, setEmailPOST] = useState("");
  const [passwordPOST, setPasswordPOST] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOTP] = useState("");
  // const [OTPCount, setOTPCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    loginMagic,
    verifyOTPMagic,
    // setIsSendingOTP,
    checkLoggedInMagic,
    disconnectWallet,
  } = useWeb3();

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

  const handlePOST = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await httpService.post("/api/authorize", {
        email: emailPOST,
        password: passwordPOST,
      });
      console.log("POST Response:", response.data);
    } catch (error) {
      console.error("Error during POST request:", error);
    }
  };
  const handlePUT = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await httpService.put("/api/authorize", {});
      console.log("PUT Response:", response.data);
    } catch (error) {
      console.error("Error during PUT request:", error);
    }
  };

  useEffect(() => {
    if (step !== "otp") return;

    if (otp.length === 6) {
      verifyOTPMagic?.(otp, () => {});
    }
  }, [otp, step]);

  return (
    <>
      <div>
        {/* <form onSubmit={handleLogout}>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
          >
            Logout
          </button>
        </form> */}
        <form onSubmit={handlePUT}>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
          >
            PUT
          </button>
        </form>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <form
            onSubmit={handlePOST}
            className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-center">POST</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={emailPOST}
                onChange={(e) => setEmailPOST(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                value={passwordPOST}
                onChange={(e) => setPasswordPOST(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
            >
              POST
            </button>
          </form>
        </div>
        {/* <form onSubmit={handleLogout}>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
          >
            PUT
          </button>
        </form> */}
        {/* <button
          onClick={async () => {
            const rs = await checkLoggedInMagic();
            console.log({ rs });
          }}
        >
          Check
        </button> */}
      </div>
      {/* {step === "email" ? (
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
      )} */}
    </>
  );
}

export default App;
