import { ChakraProvider } from "@chakra-ui/react";

import "@styles/globals.css";
import "react-toastify/dist/ReactToastify.css";

function Application({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default Application;
