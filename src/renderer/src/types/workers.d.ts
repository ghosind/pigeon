declare module 'pigeon-worker-*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
