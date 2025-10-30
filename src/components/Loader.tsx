export default function Loader() {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="box">
          <div className="logo">
            <img src="/logo.png" alt="Ayka Logo" className="logo-img" />
          </div>
        </div>
        <div className="box"></div>
        <div className="box"></div>
        <div className="box"></div>
        <div className="box"></div>
      </div>
      
      <style jsx>{`
        .loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .loader {
          --size: 250px;
          --duration: 2s;
          --logo-color: grey;
          --background: linear-gradient(
            0deg,
            rgba(50, 50, 50, 0.2) 0%,
            rgba(100, 100, 100, 0.2) 100%
          );
          height: var(--size);
          aspect-ratio: 1;
          position: relative;
        }

        .loader .box {
          position: absolute;
          background: rgba(100, 100, 100, 0.15);
          background: var(--background);
          border-radius: 50%;
          border-top: 1px solid rgba(100, 100, 100, 1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 10px 10px -0px;
          backdrop-filter: blur(5px);
          animation: ripple var(--duration) infinite ease-in-out;
        }

        .loader .box:nth-child(1) {
          inset: 40%;
          z-index: 99;
        }

        .loader .box:nth-child(2) {
          inset: 30%;
          z-index: 98;
          border-color: rgba(100, 100, 100, 0.8);
          animation-delay: 0.2s;
        }

        .loader .box:nth-child(3) {
          inset: 20%;
          z-index: 97;
          border-color: rgba(100, 100, 100, 0.6);
          animation-delay: 0.4s;
        }

        .loader .box:nth-child(4) {
          inset: 10%;
          z-index: 96;
          border-color: rgba(100, 100, 100, 0.4);
          animation-delay: 0.6s;
        }

        .loader .box:nth-child(5) {
          inset: 0%;
          z-index: 95;
          border-color: rgba(100, 100, 100, 0.2);
          animation-delay: 0.8s;
        }

        .loader .logo {
          position: absolute;
          inset: 40%;
          display: grid;
          place-content: center;
          z-index: 100;
        }

        .loader .logo .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          animation: logo-pulse var(--duration) infinite ease-in-out;
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 10px 10px -0px;
          }
          50% {
            transform: scale(1.3);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 30px 20px -0px;
          }
          100% {
            transform: scale(1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 10px 10px -0px;
          }
        }

        @keyframes logo-pulse {
          0% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.7;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
