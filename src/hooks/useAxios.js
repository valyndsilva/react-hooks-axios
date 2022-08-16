import { useState, useEffect } from "react";

const useAxios = (configObj) => {
  // https://axios-http.com/docs/req_config
  const { axiosInstance, method, url, requestConfig = {} } = configObj;

  const [response, setResponse] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const refetch = () => setReload((prev) => prev + 1);

  useEffect(() => {
    //let isMounted = true; // not needed if you use the AbortController
    const controller = new AbortController(); // let's you cancel the reuqest and that prevents memory leaks.

    const fetchData = async () => {
      try {
        // Make requests here...
        const res = await axiosInstance[method.toLowerCase()](url, {
          ...requestConfig,
          signal: controller.signal, // pass in controller that attaches the abort signal
        });
        console.log(res);
        setResponse(res.data);
      } catch (err) {
        console.log(err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // call the function
    fetchData();

    // useEffect cleanup function
    return () => controller.abort(); // cancel the request when the component unmounts

    // eslint-disable-next-line
  }, [reload]);

  return [response, error, loading, refetch];
};

export default useAxios;
