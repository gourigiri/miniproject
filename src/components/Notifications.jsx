import React from "react";

const Notifications = ({ notifications }) => {
    return (
        <div style={styles.container}>
            <h3>📢 Notifications</h3>
            {notifications.length === 0 ? (
                <p>No new notifications</p>
            ) : (
                <ul style={styles.list}>
                    {notifications.map((notif) => (
                        <li key={notif.id} style={styles.item}>
                            <strong>{notif.title}</strong>: {notif.message} <br />
                            <small>{new Date(notif.created_at).toLocaleString()}</small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const styles = {
    container: {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100%",
        backgroundColor: "#f8f9fa",
        padding: "10px",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        textAlign: "center",
    },
    list: {
        listStyleType: "none",
        padding: "0",
        margin: "0",
    },
    item: {
        backgroundColor: "#ffffff",
        padding: "10px",
        margin: "5px 0",
        borderRadius: "5px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
};

export default Notifications;