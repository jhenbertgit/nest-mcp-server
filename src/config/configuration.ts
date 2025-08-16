
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  transport: process.env.TRANSPORT || 'http',
});
