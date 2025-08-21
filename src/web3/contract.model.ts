import { Contract as ContractEthers, JsonRpcSigner, BrowserProvider, parseEther } from "ethers";
import ContractABI from "./abi/contract.abi.json";
import { showError } from "@/utils/toast";

const contractAddress = process.env.CONTRACT_ADDRESS || "";

class Contract {
  contract: ContractEthers | undefined;
  provider: BrowserProvider | undefined;
  signer: JsonRpcSigner | undefined;

  initContract(signer: JsonRpcSigner, provider: BrowserProvider) {
    this.contract = new ContractEthers(contractAddress, ContractABI, signer);
    this.provider = provider;
    this.signer = signer;
  }

  async mintItem() {
    if (this.contract) {
      try {
        const walletAddress = await this.signer?.getAddress();
        const tx = await this.contract.mint(walletAddress, 1, {
          value: parseEther("0.05"), // if mint costs 0.05 ETH
        });
      } catch (error) {
        showError(error);
      }
    }
  }
}

const ContractBase = new Contract();
export default ContractBase;
