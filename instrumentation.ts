export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { runNodeBootstrap } = await import(
    "./app/_server/bootstrap/runNodeBootstrap"
  );
  await runNodeBootstrap();
}
