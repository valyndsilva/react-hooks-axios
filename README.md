# React Hooks with Axios for Async-Await Requests

npm install axios

Axios is one of the most popular HTTP JavaScript client libraries - for many reasons. First of all, it’s isomorphic, meaning you can use it the same way, whether you’re running in a browser or in Node.js, even though HTTP APIs are different for both. On top of that, Axios is Promise-based, integrating well with modern async/await JavaScript syntax.

Axios is a perfect choice for both your front end and back end due to features such as automatic JSON transforms or built-in request cancellation.

Note: Working with hooks gets a bit more complicated when dealing with asynchronous code. Using async callbacks in useEffect() isn’t an option, as the method expects the return value, if present, to be a cleanup callback. With that said, you can still use async in useEffect() callback as follows:

```
const useAsyncStuff = () => {
 const [data, setData] = useState(null);
 const [error, setError] = useState("");
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
   const loadAsyncStuff = async () => {
     try {
       const response = await fetch(/* ... */);
       const json = await response.json();

       setData(json);
     } catch (error) {
       setError(error);
     } finally {
       setLoaded(true);
     }
   };

   loadAsyncStuff();
 }, []);

 return { data, error, loaded };
};

```

All the async tasks are inside the inner loadAsyncStuff() function. This function is called immediately after declaration and saves information about its progress with state properties like loaded and error. If all async tasks succeed, the resulting data is saved to data; otherwise, the error is caught and saved to error. In both cases, loaded is set to true when the async task finishes. Wrapping the logic inside useEffect() ensures it only runs once.

## Creating Axios Hooks

```
npm install axios
```

```

const useAxiosPost = (url, payload) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const response = await axios.post(
          url,
          payload
        );
        setData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  return { data, error, loaded };
};
```

You might also prefer the “traditional” Promise syntax, which can be a bit more compact.

```
const useAxiosPost = (url, payload) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios
      .post(url, payload)
      .then((response) => setData(response.data))
      .catch((error) => setError(error.message))
      .finally(() => setLoaded(true));
  }, []);

  return { data, error, loaded };
};
```

The hook uses Axios’s post() shorthand method to send a POST request to the provided URL with given data. Aside from that, JSON-parsed response data is stored in data, and the error message is stored in error.

The hook can be used as follow:

```
const App = () => {
  const { data, error, loaded } = useAxiosPost(
    "https://httpbin.org/post",
    {
      message: "Hello World",
    }
  );
  const stringifiedData = useMemo(() => {
    return JSON.stringify(data || {});
  }, [data]);

  if (loaded) {
    return error ? (
      <span>Error: {error}</span>
    ) : (
      <p>{stringifiedData}</p>
    );
  }
  return <span>Loading...</span>;
};
```

The hook provides all necessary data to render the component throughout the fetching process.

Let’s change the post() method to request(), passing a complete request configuration including the request method. Additionally, return a cancel function that allows users to cancel the request.

```
const useAxios = (url, method, payload) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const controllerRef = useRef(new AbortController());
  const cancel = () => {
    controllerRef.current.abort();
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.request({
          data: payload,
          signal: controllerRef.current.signal,
          method,
          url,
        });

        setData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return { cancel, data, error, loaded };
};
```

From v0.22.0 onwards, Axios supports AbortController, making request canceling easier and deprecating its custom CancelToken API. To cancel a request with Axios, you first have to create a new AbortController instance. This controller allows aborting one or more HTTP requests. When used in React hook, it has to be wrapped in a useRef or similar, not to create a new instance on every re-render.

The most important property of AbortController is signal, which holds an instance of AbortSignal and should be provided to the request(s) the controller is meant for. With the signal provided in Axios request config, canceling the request is a matter of calling the abort() method on the controller instance.

## Extending integration with React Context

Axios provides functionality to create separate instances of the library with different configurations. It allows you to use custom configs defining, e.g., base URL or default headers to be supplied with every request made through a given instance. It’s handy in larger apps when making many requests to the same origin or connecting with various APIs to reuse configuration.

On top of that, Axios allows you to define interceptor functions for both the base and custom instances. These allow you to intercept the data before, e.g., the request is sent, or then() callback is called. As such, there are both request and response interceptors.

To integrate Axios instances with React, you can use React Context. It’d make the instance available to all child components, from where useAxios() hooks will use it to handle the request. If no instance is available, the hook can always fall back to the default one available under axios. To implement this, start by creating a new context provider component:

```
const AxiosContext = createContext(null);
const AxiosInstanceProvider = ({
  config = {},
  requestInterceptors = [],
  responseInterceptors = [],
  children,
}) => {
  const instanceRef = useRef(axios.create(config));

  useEffect(() => {
    requestInterceptors.forEach((interceptor) => {
      instanceRef.current.interceptors.request.use(
        interceptor
      );
    });
    responseInterceptors.forEach((interceptor) => {
      instanceRef.current.interceptors.response.use(
        interceptor
      );
    });
  }, []);

  return (
    <AxiosContext.Provider value={instanceRef.current}>
      {children}
    </AxiosContext.Provider>
  );
};
```

Inside the AxiosInstanceProvider component, the Axios instance is created using provided config and saved to instanceRef ref. All interceptors are registered inside the useEffect() callback to prevent unnecessary processing on re-renders. With this done, return to useAxios() to adjust the hook to use the context-provided Axios instance when available.

```
const useAxios = (url, method, payload) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const contextInstance = useContext(AxiosContext);
  const instance = useMemo(() => {
    return contextInstance || axios;
  }, [contextInstance]);
  const controllerRef = useRef(new AbortController());
  const cancel = () => {
    controllerRef.current.abort();
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await instance.request({
          signal: controllerRef.current.signal,
          data: payload,
          method,
          url,
        });

        setData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return { cancel, data, error, loaded };
};
```

The context is loaded using useContext() hook to the contextInstance variable. The actual instance results from useMemo() computation and can return the default Axios instance if it’s not provided in the context. To use such a setup, make sure your app is wrapped inside an AxiosInstanceProvider component, at least a level higher than where you’ll use useAxios() Hook. You can provide config and different interceptors as component props.

```
const App = () => {
  return (
    <AxiosInstanceProvider
      config={{ baseURL: "https://httpbin.org/" }}
    >
      <Test>Test</Test>
    </AxiosInstanceProvider>
  );
};
```

Then, inside the child component, simply use the Hook like before. The use of context, sending, and processing the request will all happen in the background.

```
const Test = () => {
  const { data, error, loaded } = useAxios(
    "/post",
    "POST",
    {
      message: "Hello World",
    }
  );
  const stringifiedData = useMemo(() => {
    return JSON.stringify(data || {});
  }, [data]);

  if (loaded) {
    return error ? (
      <span>Error: {error}</span>
    ) : (
      <p>{stringifiedData}</p>
    );
  }
  return <span>Loading...</span>;
};
```

Axios is an excellent library if you want consistent data-fetching experience across your front end and Node.js back end. For an HTTP client, it has many features and shortcuts to achieve the thing you want in the best and most pleasing way.

Combining Axios with React can result in great abstraction on top of an asynchronous task. Thanks to React Hooks, the ergonomics and ease of use of such a setup are simply outstanding.
