import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class ExpenseServlet extends HttpServlet {

    // Helper method to connect to your MySQL database (Uses your password Root@123)
    private Connection getConnection() throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        return DriverManager.getConnection("jdbc:mysql://localhost:3306/expenseflow_db", "root", "Root@123");
    }

    // 1. GET: Fetch rows from MySQL and format them as a JSON array for script.js
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();
        StringBuilder json = new StringBuilder("[");

        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT * FROM expenses ORDER BY expense_date DESC");
             ResultSet rs = ps.executeQuery()) {
            
            boolean first = true;
            while (rs.next()) {
                if (!first) json.append(",");
                json.append("{")
                    .append("\"id\":\"").append(rs.getInt("id")).append("\",")
                    .append("\"name\":\"").append(rs.getString("name").replace("\"", "\\\"")).append("\",")
                    .append("\"price\":").append(rs.getDouble("price")).append(",")
                    .append("\"date\":\"").append(rs.getString("expense_date")).append("\"")
                    .append("}");
                first = false;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        json.append("]");
        out.print(json.toString());
    }

    // 2. POST: Handles BOTH saving new entries and deleting entries based on form parameters
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String action = request.getParameter("action");

        // CASE A: Handle Delete Requests sent via script.js deleteSub()
        if ("delete".equalsIgnoreCase(action)) {
            String id = request.getParameter("id");
            if (id == null || id.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement("DELETE FROM expenses WHERE id = ?")) {
                ps.setInt(1, Integer.parseInt(id.trim()));
                ps.executeUpdate();
                response.setStatus(HttpServletResponse.SC_OK);
            } catch (Exception e) {
                e.printStackTrace();
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } 
        // CASE B: Handle Add / Save Requests sent via script.js saveSub()
        else {
            String name = request.getParameter("name");
            String priceStr = request.getParameter("price");
            String date = request.getParameter("date");

            if (name == null || priceStr == null || date == null) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement("INSERT INTO expenses (name, price, expense_date) VALUES (?, ?, ?)")) {
                ps.setString(1, name.trim());
                ps.setDouble(2, Double.parseDouble(priceStr.trim()));
                ps.setString(3, date.trim());
                ps.executeUpdate();
                response.setStatus(HttpServletResponse.SC_OK);
            } catch (Exception e) {
                e.printStackTrace();
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }
    }
}