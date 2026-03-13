import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
          Welcome to <span className="text-blue-600">Expense Tracker</span>
        </h1>

        <p className="text-slate-600">
          Track your expenses, understand your spending, and stay in control of
          your money with a clean and simple dashboard.
        </p>

        <div className="flex items-center justify-center pt-4">
          <Link
            to="/auth"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition"
          >
            Login
          </Link>

          {/* FUTURE: Uncomment when you want public signup */}
          {/* <Link
            to="/auth"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition"
          >
            Sign up
          </Link> */}
        </div>
      </div>
    </div>
  );
}

export default Home;