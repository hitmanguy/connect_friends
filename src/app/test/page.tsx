import { notFound } from "next/navigation";
//import { ssrTrpc } from "../../../backend/trpc/ssr-caller";

export default async function TestPage() {
  return notFound();

  //   const data = await ssrTrpc.sampleProcedure();
  //   return (
  //     <div>
  //       <pre>{JSON.stringify(data, null, 2)}</pre>
  //     </div>
  //   );
}
