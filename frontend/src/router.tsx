import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { Layout } from "./routes/Layout";

import { LoginPage } from "./routes/Login";
import { HomePage } from "./routes/Home";
import { BrowseQuizzes } from "./routes/BrowseQuizzes";
import { NewQuiz } from "./routes/NewQuiz";
import { QuizDetail } from "./routes/QuizDetail";
import { TakeQuiz } from "./routes/TakeQuiz";
import { MyQuizzes } from "./routes/MyQuizzes";
import { EditQuiz } from "./routes/EditQuiz";
import { MyPoints } from "./routes/MyPoints";
import { MyAchievements } from "./routes/MyAchievements";
import { Leaderboards } from "./routes/Leaderboards";
import { UserAchievements } from "./routes/UserAchievements";
import { AdminDashboard } from "./routes/admin/Dashboard";
import { AdminUsers } from "./routes/admin/Users";
import { AdminQuizzes } from "./routes/admin/Quizzes";
import { AdminAchievements } from "./routes/admin/Achievements";
import { AdminEvents } from "./routes/admin/Events";
import { AdminSettings } from "./routes/admin/Settings";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/quizzes", element: <BrowseQuizzes /> },
      { path: "/quizzes/new", element: <NewQuiz /> },
      { path: "/quizzes/:id", element: <QuizDetail /> },
      { path: "/quizzes/:id/take", element: <TakeQuiz /> },
      { path: "/my/quizzes", element: <MyQuizzes /> },
      { path: "/my/quizzes/:id/edit", element: <EditQuiz /> },
      { path: "/me", element: <Navigate to="/me/points" replace /> },
      { path: "/me/points", element: <MyPoints /> },
      { path: "/me/achievements", element: <MyAchievements /> },
      { path: "/leaderboards", element: <Leaderboards /> },
      { path: "/users/:id/achievements", element: <UserAchievements /> },
      {
        element: <RequireAdmin><AdminDashboard /></RequireAdmin>,
        path: "/admin",
      },
      { path: "/admin/users", element: <RequireAdmin><AdminUsers /></RequireAdmin> },
      { path: "/admin/quizzes", element: <RequireAdmin><AdminQuizzes /></RequireAdmin> },
      { path: "/admin/achievements", element: <RequireAdmin><AdminAchievements /></RequireAdmin> },
      { path: "/admin/events", element: <RequireAdmin><AdminEvents /></RequireAdmin> },
      { path: "/admin/settings", element: <RequireAdmin><AdminSettings /></RequireAdmin> },
    ],
  },
]);
