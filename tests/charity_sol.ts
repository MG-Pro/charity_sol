import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CharitySol } from "../target/types/charity_sol";

describe("charity_sol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CharitySol as Program<CharitySol>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
